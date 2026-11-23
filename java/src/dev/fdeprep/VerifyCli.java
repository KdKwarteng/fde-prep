package dev.fdeprep;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Checks every problem's Java block on a normal JVM, through the same Harness the
 * browser uses: the reference solution must pass every test and the starter must not.
 * Usage: java -cp public/java/harness.jar dev.fdeprep.VerifyCli content/problems
 */
public final class VerifyCli {
    public static void main(String[] args) throws Exception {
        List<Path> files;
        try (Stream<Path> s = Files.list(Path.of(args.length > 0 ? args[0] : "content/problems"))) {
            files = s.filter(p -> p.toString().endsWith(".json")).sorted().collect(Collectors.toList());
        }
        int failures = 0;
        for (Path file : files) {
            String name = file.getFileName().toString().replace(".json", "");
            Map<?, ?> problem = (Map<?, ?>) Json.parse(Files.readString(file, StandardCharsets.UTF_8));
            Map<?, ?> java = (Map<?, ?>) problem.get("java");
            StringBuilder issues = new StringBuilder();
            if (java == null) {
                issues.append("     missing java block\n");
            } else {
                String tests = Json.write(problem.get("tests"));
                String method = (String) java.get("methodName");
                for (String key : List.of("methodName", "starterCode", "solution", "hints")) {
                    if (!java.containsKey(key)) issues.append("     missing java.").append(key).append('\n');
                }
                Map<?, ?> report = (Map<?, ?>) Json.parse(Harness.run((String) java.get("solution"), method, tests));
                if (report.get("error") != null) issues.append("     solution error: ").append(report.get("error")).append('\n');
                List<?> results = (List<?>) report.get("results");
                for (int i = 0; i < results.size(); i++) {
                    Map<?, ?> r = (Map<?, ?>) results.get(i);
                    if (!Boolean.TRUE.equals(r.get("passed"))) {
                        issues.append("     solution fails test ").append(i + 1).append(": got ")
                              .append(Json.write(r.get("got"))).append(' ')
                              .append(r.get("error") == null ? "" : r.get("error")).append('\n');
                    }
                }
                Map<?, ?> starter = (Map<?, ?>) Json.parse(Harness.run((String) java.get("starterCode"), method, tests));
                if (starter.get("error") != null && String.valueOf(starter.get("error")).startsWith("Line ")) {
                    issues.append("     starter does not compile: ").append(starter.get("error")).append('\n');
                } else if (starter.get("error") == null
                        && ((List<?>) starter.get("results")).stream().allMatch(r -> Boolean.TRUE.equals(((Map<?, ?>) r).get("passed")))) {
                    issues.append("     starter already passes every test\n");
                }
            }
            System.out.println((issues.length() == 0 ? "ok   " : "FAIL ") + name);
            System.out.print(issues);
            if (issues.length() > 0) failures++;
        }
        System.out.println();
        System.out.println((files.size() - failures) + " of " + files.size() + " Java solutions verified");
        System.exit(failures == 0 ? 0 : 1);
    }
}
