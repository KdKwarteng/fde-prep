package dev.fdeprep;

import java.lang.reflect.Array;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.lang.reflect.WildcardType;
import java.util.ArrayList;
import java.util.Collection;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Converts between parsed JSON (Map, List, String, Long, Double, Boolean, null)
 * and the Java types a learner's method declares, using its generic signature.
 */
final class Convert {
    private Convert() {}

    /** JSON value to the declared parameter type. */
    static Object toJava(Object json, Type type) {
        if (type instanceof WildcardType) return toJava(json, ((WildcardType) type).getUpperBounds()[0]);
        if (type instanceof TypeVariable) return plain(json);
        if (type instanceof GenericArrayType) {
            Type component = ((GenericArrayType) type).getGenericComponentType();
            return toArray(json, rawClass(component), component);
        }
        if (type instanceof ParameterizedType) {
            ParameterizedType p = (ParameterizedType) type;
            Class<?> raw = (Class<?>) p.getRawType();
            Type[] args = p.getActualTypeArguments();
            if (Map.class.isAssignableFrom(raw)) {
                Map<String, Object> out = raw.isAssignableFrom(TreeMap.class) && !raw.isAssignableFrom(LinkedHashMap.class)
                        ? new TreeMap<>() : new LinkedHashMap<>();
                for (Map.Entry<?, ?> e : asMap(json).entrySet()) {
                    out.put((String) e.getKey(), toJava(e.getValue(), args[1]));
                }
                return out;
            }
            if (Collection.class.isAssignableFrom(raw)) {
                Collection<Object> out = Set.class.isAssignableFrom(raw) ? new java.util.LinkedHashSet<>() : new ArrayList<>();
                for (Object item : asList(json)) out.add(toJava(item, args[0]));
                return out;
            }
            return toJava(json, raw);
        }
        Class<?> c = (Class<?>) type;
        if (json == null) {
            if (c.isPrimitive()) throw new IllegalArgumentException("null cannot be passed as " + c.getSimpleName());
            return null;
        }
        if (c == Object.class) return plain(json);
        if (c == int.class || c == Integer.class) return ((Number) json).intValue();
        if (c == long.class || c == Long.class) return ((Number) json).longValue();
        if (c == double.class || c == Double.class) return ((Number) json).doubleValue();
        if (c == float.class || c == Float.class) return ((Number) json).floatValue();
        if (c == boolean.class || c == Boolean.class) return json;
        if (c == char.class || c == Character.class) return ((String) json).charAt(0);
        if (c == String.class) return json;
        if (c.isArray()) return toArray(json, c.getComponentType(), c.getComponentType());
        if (Map.class.isAssignableFrom(c)) return toJava(json, Object.class);
        if (List.class.isAssignableFrom(c)) return plain(json);
        return toObject(json, c);
    }

    private static Object toArray(Object json, Class<?> component, Type componentType) {
        List<?> items = asList(json);
        Object array = Array.newInstance(component, items.size());
        for (int i = 0; i < items.size(); i++) Array.set(array, i, toJava(items.get(i), componentType));
        return array;
    }

    /** A JSON object becomes an instance of a plain class by setting its fields by name. */
    private static Object toObject(Object json, Class<?> c) {
        Map<?, ?> map = asMap(json);
        try {
            Constructor<?> ctor = c.getDeclaredConstructor();
            ctor.setAccessible(true);
            Object instance = ctor.newInstance();
            for (Field field : fields(c)) {
                if (map.containsKey(field.getName())) {
                    field.set(instance, toJava(map.get(field.getName()), field.getGenericType()));
                }
            }
            return instance;
        } catch (NoSuchMethodException e) {
            throw new IllegalArgumentException(c.getSimpleName() + " needs a constructor with no arguments");
        } catch (ReflectiveOperationException e) {
            throw new IllegalArgumentException("Could not create " + c.getSimpleName() + ": " + e);
        }
    }

    /** Parsed JSON with whole numbers narrowed to Integer when they fit, so Object-typed code sees ints. */
    private static Object plain(Object json) {
        if (json instanceof Long) {
            long v = (Long) json;
            return v == (int) v ? (Object) (int) v : (Object) v;
        }
        if (json instanceof Map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : ((Map<?, ?>) json).entrySet()) out.put((String) e.getKey(), plain(e.getValue()));
            return out;
        }
        if (json instanceof List) {
            List<Object> out = new ArrayList<>();
            for (Object item : (List<?>) json) out.add(plain(item));
            return out;
        }
        return json;
    }

    /** Any Java value back to comparable JSON form: numbers become Long or Double, sets become sorted lists. */
    static Object toJson(Object value) {
        return toJson(value, new IdentityHashMap<>());
    }

    private static Object toJson(Object value, IdentityHashMap<Object, Boolean> seen) {
        if (value == null || value instanceof String || value instanceof Boolean) return value;
        if (value instanceof Character) return String.valueOf(value);
        if (value instanceof Double || value instanceof Float) return ((Number) value).doubleValue();
        if (value instanceof Number) return ((Number) value).longValue();
        if (value instanceof Enum) return ((Enum<?>) value).name();
        if (seen.containsKey(value)) throw new IllegalStateException("The returned value contains a cycle");
        seen.put(value, true);
        try {
            if (value.getClass().isArray()) {
                List<Object> out = new ArrayList<>();
                for (int i = 0; i < Array.getLength(value); i++) out.add(toJson(Array.get(value, i), seen));
                return out;
            }
            if (value instanceof Map) {
                Map<String, Object> out = new LinkedHashMap<>();
                for (Map.Entry<?, ?> e : ((Map<?, ?>) value).entrySet()) {
                    out.put(String.valueOf(e.getKey()), toJson(e.getValue(), seen));
                }
                return out;
            }
            if (value instanceof Set) {
                List<Object> out = new ArrayList<>();
                for (Object item : (Set<?>) value) out.add(toJson(item, seen));
                out.sort((a, b) -> Json.write(a).compareTo(Json.write(b)));
                return out;
            }
            if (value instanceof Iterable) {
                List<Object> out = new ArrayList<>();
                for (Object item : (Iterable<?>) value) out.add(toJson(item, seen));
                return out;
            }
            Map<String, Object> out = new LinkedHashMap<>();
            for (Field field : fields(value.getClass())) {
                try {
                    out.put(field.getName(), toJson(field.get(value), seen));
                } catch (IllegalAccessException e) {
                    throw new IllegalStateException(e);
                }
            }
            return out;
        } finally {
            seen.remove(value);
        }
    }

    private static List<Field> fields(Class<?> c) {
        List<Field> out = new ArrayList<>();
        for (Field field : c.getDeclaredFields()) {
            int mods = field.getModifiers();
            if (Modifier.isStatic(mods) || field.isSynthetic()) continue;
            field.setAccessible(true);
            out.add(field);
        }
        return out;
    }

    private static Map<?, ?> asMap(Object json) {
        if (!(json instanceof Map)) throw new IllegalArgumentException("Expected a JSON object but got " + Json.write(json));
        return (Map<?, ?>) json;
    }

    private static List<?> asList(Object json) {
        if (!(json instanceof List)) throw new IllegalArgumentException("Expected a JSON array but got " + Json.write(json));
        return (List<?>) json;
    }

    private static Class<?> rawClass(Type type) {
        if (type instanceof Class) return (Class<?>) type;
        if (type instanceof ParameterizedType) return (Class<?>) ((ParameterizedType) type).getRawType();
        if (type instanceof GenericArrayType) {
            return Array.newInstance(rawClass(((GenericArrayType) type).getGenericComponentType()), 0).getClass();
        }
        return Object.class;
    }

    /** Structural equality that treats 2 and 2.0 as equal. */
    static boolean same(Object a, Object b) {
        if (a == null || b == null) return a == b;
        if (a instanceof Number && b instanceof Number) {
            if (a instanceof Long && b instanceof Long) return a.equals(b);
            return Math.abs(((Number) a).doubleValue() - ((Number) b).doubleValue()) < 1e-9;
        }
        if (a instanceof List && b instanceof List) {
            List<?> x = (List<?>) a, y = (List<?>) b;
            if (x.size() != y.size()) return false;
            for (int i = 0; i < x.size(); i++) if (!same(x.get(i), y.get(i))) return false;
            return true;
        }
        if (a instanceof Map && b instanceof Map) {
            Map<?, ?> x = (Map<?, ?>) a, y = (Map<?, ?>) b;
            if (!x.keySet().equals(y.keySet())) return false;
            for (Object key : x.keySet()) if (!same(x.get(key), y.get(key))) return false;
            return true;
        }
        return a.equals(b);
    }
}
