package dev.fdeprep;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.FileObject;
import javax.tools.ForwardingJavaFileManager;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

/**
 * Compiles a learner's Solution class in memory, calls one of its methods once per
 * test case, and returns a JSON report. The browser calls {@link #run} through
 * CheerpJ, and {@link VerifyCli} calls it on a normal JVM to check the problem bank.
 *
 * <p>The report has the same shape as the Python harness in public/harness.py:
 * {"error": string|null, "results": [{"passed", "got", "error", "stdout", "ms"}]}.
 */
public final class Harness {
    private static final String CLASS_NAME = "Solution";
    private static final long TIME_LIMIT_MS = 10_000;

    private Harness() {}

    public static String run(String code, String methodName, String testsJson) {
        Map<String, Object> report = new LinkedHashMap<>();
        List<Object> results = new ArrayList<>();
        report.put("error", null);
        report.put("results", results);

        Class<?> solution;
        try {
            solution = compile(code);
        } catch (CompileError e) {
            report.put("error", e.getMessage());
            return Json.write(report);
        }

        Method method = findMethod(solution, methodName);
        if (method == null) {
            report.put("error", "Define a method named " + methodName + " inside class Solution.");
            return Json.write(report);
        }
        method.setAccessible(true);

        Object instance = null;
        if (!Modifier.isStatic(method.getModifiers())) {
            try {
                var ctor = solution.getDeclaredConstructor();
                ctor.setAccessible(true);
                instance = ctor.newInstance();
            } catch (ReflectiveOperationException e) {
                report.put("error", "Make " + methodName + " static, or give Solution a constructor with no arguments.");
                return Json.write(report);
            }
        }

        List<?> tests = (List<?>) Json.parse(testsJson);
        long deadline = System.currentTimeMillis() + TIME_LIMIT_MS;
        for (Object t : tests) {
            Map<?, ?> test = (Map<?, ?>) t;
            Map<String, Object> entry = runOne(method, instance, (List<?>) test.get("args"), test.get("expected"), deadline);
            results.add(entry);
            if (Boolean.TRUE.equals(entry.remove("timedOut"))) {
                report.put("error", "Timed out after " + (TIME_LIMIT_MS / 1000)
                        + " seconds. Check for an infinite loop. If later runs stay slow, reload the page.");
                break;
            }
        }
        return Json.write(report);
    }

    private static Map<String, Object> runOne(Method method, Object instance, List<?> rawArgs, Object expected, long deadline) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("passed", false);
        entry.put("got", null);
        entry.put("error", null);
        entry.put("stdout", "");
        entry.put("ms", 0);

        Object[] args;
        try {
            java.lang.reflect.Type[] types = method.getGenericParameterTypes();
            if (types.length != rawArgs.size()) {
                entry.put("error", "This test passes " + rawArgs.size() + " argument(s) but "
                        + method.getName() + " takes " + types.length + ".");
                return entry;
            }
            args = new Object[types.length];
            for (int i = 0; i < types.length; i++) args[i] = Convert.toJava(rawArgs.get(i), types[i]);
        } catch (RuntimeException e) {
            entry.put("error", "Could not convert the test input: " + e.getMessage());
            return entry;
        }

        ByteArrayOutputStream captured = new ByteArrayOutputStream();
        PrintStream originalOut = System.out;
        Object[] outcome = new Object[2]; // [0] = return value, [1] = Throwable
        Thread worker = new Thread(() -> {
            try {
                outcome[0] = method.invoke(instance, args);
            } catch (InvocationTargetException e) {
                outcome[1] = e.getCause();
            } catch (Throwable e) {
                outcome[1] = e;
            }
        }, "solution");
        worker.setDaemon(true);

        long started = System.nanoTime();
        System.setOut(new PrintStream(limit(captured), true, StandardCharsets.UTF_8));
        try {
            worker.start();
            worker.join(Math.max(1, deadline - System.currentTimeMillis()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            System.setOut(originalOut);
        }
        entry.put("ms", Math.round((System.nanoTime() - started) / 10_000.0) / 100.0);
        entry.put("stdout", captured.toString(StandardCharsets.UTF_8));

        if (worker.isAlive()) {
            worker.interrupt();
            entry.put("error", "Timed out");
            entry.put("timedOut", true);
            return entry;
        }
        if (outcome[1] != null) {
            entry.put("error", describe((Throwable) outcome[1]));
            return entry;
        }
        try {
            Object got = Convert.toJson(outcome[0]);
            entry.put("got", got);
            entry.put("passed", Convert.same(got, expected));
        } catch (RuntimeException e) {
            entry.put("error", "Could not read the return value: " + e.getMessage());
        }
        return entry;
    }

    private static Method findMethod(Class<?> c, String name) {
        Method found = null;
        for (Method m : c.getDeclaredMethods()) {
            if (m.getName().equals(name) && !m.isSynthetic()) {
                if (found != null) return found; // overloaded: take the first declared
                found = m;
            }
        }
        return found;
    }

    /** Exception type, message, and only the stack frames from the learner's code. */
    private static String describe(Throwable error) {
        StringBuilder sb = new StringBuilder();
        int frames = 0;
        for (StackTraceElement frame : error.getStackTrace()) {
            String cls = frame.getClassName();
            if (!cls.equals(CLASS_NAME) && !cls.startsWith(CLASS_NAME + "$")) continue;
            if (frames++ == 6) break;
            sb.append("  line ").append(frame.getLineNumber()).append(", in ").append(frame.getMethodName()).append('\n');
        }
        sb.append(error.getClass().getName());
        if (error.getMessage() != null) sb.append(": ").append(error.getMessage());
        if (error instanceof StackOverflowError) sb.append(" (recursion went too deep)");
        return sb.toString();
    }

    private static OutputStream limit(ByteArrayOutputStream out) {
        return new OutputStream() {
            @Override
            public void write(int b) {
                if (out.size() < 4000) out.write(b);
            }
        };
    }

    // ---- In-memory compilation -------------------------------------------------

    private static final class CompileError extends Exception {
        CompileError(String message) {
            super(message);
        }
    }

    private static JavaCompiler cachedCompiler;
    private static boolean usingEcj;

    /**
     * Prefer the JDK's own javac. If the runtime does not ship it, fall back to
     * the Eclipse compiler (ecj.jar), which the site serves next to this jar.
     * Set -Dfdeprep.compiler=ecj to force the fallback when testing.
     */
    private static JavaCompiler compiler() throws CompileError {
        if (cachedCompiler != null) return cachedCompiler;
        boolean forceEcj = "ecj".equals(System.getProperty("fdeprep.compiler"));
        JavaCompiler compiler = null;
        if (!forceEcj) {
            try {
                compiler = ToolProvider.getSystemJavaCompiler();
            } catch (RuntimeException | LinkageError e) {
                compiler = null;
            }
            if (compiler == null) compiler = byReflection("com.sun.tools.javac.api.JavacTool", true);
        }
        if (compiler == null) {
            compiler = byReflection("org.eclipse.jdt.internal.compiler.tool.EclipseCompiler", false);
            usingEcj = compiler != null;
        }
        if (compiler == null) throw new CompileError("The Java compiler is not available in this runtime.");
        cachedCompiler = compiler;
        return compiler;
    }

    private static JavaCompiler byReflection(String className, boolean factory) {
        try {
            Class<?> tool = Class.forName(className);
            Object instance = factory ? tool.getMethod("create").invoke(null) : tool.getDeclaredConstructor().newInstance();
            return (JavaCompiler) instance;
        } catch (ReflectiveOperationException | LinkageError | ClassCastException e) {
            return null;
        }
    }

    private static Class<?> compile(String code) throws CompileError {
        JavaCompiler compiler = compiler();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        Map<String, ByteArrayOutputStream> classes = new HashMap<>();

        StandardJavaFileManager standard = compiler.getStandardFileManager(diagnostics, Locale.ENGLISH, StandardCharsets.UTF_8);
        ForwardingJavaFileManager<StandardJavaFileManager> memory = new ForwardingJavaFileManager<>(standard) {
            @Override
            public JavaFileObject getJavaFileForOutput(Location location, String className, JavaFileObject.Kind kind, FileObject sibling) {
                return new SimpleJavaFileObject(URI.create("mem:///" + className.replace('.', '/') + kind.extension), kind) {
                    @Override
                    public OutputStream openOutputStream() {
                        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                        classes.put(className, bytes);
                        return bytes;
                    }
                };
            }
        };

        JavaFileObject source = new SimpleJavaFileObject(URI.create("mem:///" + CLASS_NAME + ".java"), JavaFileObject.Kind.SOURCE) {
            @Override
            public CharSequence getCharContent(boolean ignoreEncodingErrors) {
                return code;
            }
        };

        List<String> options = usingEcj
                ? List.of("-g", "-proc:none", "-nowarn", "-17", "-encoding", "UTF-8")
                : List.of("-g", "-proc:none", "-nowarn", "-Xlint:none");
        // ECJ only accepts sources that exist on disk, so write a scratch copy for it.
        Iterable<? extends JavaFileObject> units = List.of(source);
        if (usingEcj) {
            try {
                java.nio.file.Path dir = java.nio.file.Files.isDirectory(java.nio.file.Paths.get("/files"))
                        ? java.nio.file.Files.createDirectories(java.nio.file.Paths.get("/files/fde-prep"))
                        : java.nio.file.Files.createTempDirectory("fde-prep");
                java.nio.file.Path file = dir.resolve(CLASS_NAME + ".java");
                java.nio.file.Files.write(file, code.getBytes(StandardCharsets.UTF_8));
                units = standard.getJavaFileObjects(file.toFile());
            } catch (java.io.IOException e) {
                throw new CompileError("Could not prepare your code for the compiler: " + e.getMessage());
            }
        }
        boolean ok = compiler.getTask(new java.io.StringWriter(), memory, diagnostics, options, null, units).call();
        if (!ok) {
            StringBuilder sb = new StringBuilder();
            int shown = 0;
            for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
                if (d.getKind() != Diagnostic.Kind.ERROR) continue;
                if (shown++ == 5) { sb.append("…and more errors\n"); break; }
                sb.append("Line ").append(d.getLineNumber()).append(": ").append(d.getMessage(Locale.ENGLISH)).append('\n');
            }
            throw new CompileError(sb.toString().trim());
        }
        if (!classes.containsKey(CLASS_NAME)) {
            throw new CompileError("Your code must define a class named Solution.");
        }

        ClassLoader loader = new ClassLoader(Harness.class.getClassLoader()) {
            @Override
            protected Class<?> findClass(String name) throws ClassNotFoundException {
                ByteArrayOutputStream bytes = classes.get(name);
                if (bytes == null) throw new ClassNotFoundException(name);
                byte[] b = bytes.toByteArray();
                return defineClass(name, b, 0, b.length);
            }
        };
        try {
            return loader.loadClass(CLASS_NAME);
        } catch (ClassNotFoundException e) {
            throw new CompileError("Your code must define a class named Solution.");
        }
    }

    /** Compiles a trivial class so later runs skip the compiler's startup cost. */
    public static String warmUp() {
        return run("class Solution { static int f(int x) { return x + 1; } }", "f", "[{\"args\":[1],\"expected\":2}]");
    }
}
