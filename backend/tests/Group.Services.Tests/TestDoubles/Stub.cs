using System.Reflection;

namespace Group.Services.Tests.TestDoubles;

/// <summary>
/// Test double cho các interface lớn: chỉ cần khai báo những method test quan tâm, method khác trả giá trị mặc định.
/// </summary>
public class Stub<T> : DispatchProxy where T : class
{
    private readonly Dictionary<string, Func<object?[], object?>> _handlers = new();

    public static (T Instance, Stub<T> Config) Create()
    {
        var instance = DispatchProxy.Create<T, Stub<T>>();
        return (instance, (Stub<T>)(object)instance);
    }

    public Stub<T> On(string methodName, Func<object?[], object?> handler)
    {
        _handlers[methodName] = handler;
        return this;
    }

    public Stub<T> Returns<TResult>(string methodName, TResult result) =>
        On(methodName, _ => Task.FromResult(result));

    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        if (_handlers.TryGetValue(targetMethod!.Name, out var handler))
        {
            return handler(args ?? []);
        }

        var returnType = targetMethod.ReturnType;
        if (returnType == typeof(void)) return null;
        if (returnType == typeof(Task)) return Task.CompletedTask;
        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            var valueType = returnType.GetGenericArguments()[0];
            var value = valueType.IsValueType ? Activator.CreateInstance(valueType) : null;
            return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(valueType).Invoke(null, [value]);
        }

        return returnType.IsValueType ? Activator.CreateInstance(returnType) : null;
    }
}
