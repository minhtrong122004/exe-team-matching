using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using User.API.Controllers;
using Xunit;

namespace User.Services.Tests;

public class SwaggerEndpointTests
{
    [Theory]
    [InlineData(typeof(UsersController), nameof(UsersController.GetCurrentUserProfile), typeof(HttpGetAttribute), "me")]
    [InlineData(typeof(UsersController), nameof(UsersController.UpdateCurrentUserProfile), typeof(HttpPutAttribute), "me")]
    [InlineData(typeof(UsersController), nameof(UsersController.GetProfileById), typeof(HttpGetAttribute), "{id:guid}")]
    [InlineData(typeof(UsersController), nameof(UsersController.SearchProfiles), typeof(HttpGetAttribute), null)]
    [InlineData(typeof(UsersController), nameof(UsersController.GetBatchProfiles), typeof(HttpPostAttribute), "batch")]
    public void UsersController_Endpoints_AreProperlyConfigured(Type controllerType, string actionName, Type httpMethodAttr, string? template)
    {
        var method = controllerType.GetMethod(actionName);
        Assert.NotNull(method);

        var httpAttr = method.GetCustomAttribute(httpMethodAttr) as HttpMethodAttribute;
        Assert.NotNull(httpAttr);

        if (template != null)
        {
            Assert.Equal(template, httpAttr.Template);
        }
    }

    [Theory]
    [InlineData(typeof(SkillsController), nameof(SkillsController.GetSkills), typeof(HttpGetAttribute), null)]
    [InlineData(typeof(SkillsController), nameof(SkillsController.CreateSkill), typeof(HttpPostAttribute), null)]
    [InlineData(typeof(SkillsController), nameof(SkillsController.GetSkillById), typeof(HttpGetAttribute), "{id:guid}")]
    [InlineData(typeof(SkillsController), nameof(SkillsController.GetCurrentUserSkills), typeof(HttpGetAttribute), "/api/users/me/skills")]
    [InlineData(typeof(SkillsController), nameof(SkillsController.SetCurrentUserSkills), typeof(HttpPutAttribute), "/api/users/me/skills")]
    [InlineData(typeof(SkillsController), nameof(SkillsController.UpdateUserSkillProficiency), typeof(HttpPatchAttribute), "/api/users/me/skills/{skillId:guid}")]
    [InlineData(typeof(SkillsController), nameof(SkillsController.RemoveSkillFromUser), typeof(HttpDeleteAttribute), "/api/users/me/skills/{skillId:guid}")]
    public void SkillsController_Endpoints_AreProperlyConfigured(Type controllerType, string actionName, Type httpMethodAttr, string? template)
    {
        var method = controllerType.GetMethod(actionName);
        Assert.NotNull(method);

        var httpAttr = method.GetCustomAttribute(httpMethodAttr) as HttpMethodAttribute;
        Assert.NotNull(httpAttr);

        if (template != null)
        {
            Assert.Equal(template, httpAttr.Template);
        }
    }

    [Fact]
    public void AllControllers_AreDecoratedWithAuthorizeAttribute()
    {
        Assert.NotNull(typeof(UsersController).GetCustomAttribute<AuthorizeAttribute>());
        Assert.NotNull(typeof(SkillsController).GetCustomAttribute<AuthorizeAttribute>());
    }

    [Fact]
    public void AdminEndpoints_EnforceAdminRole()
    {
        var method = typeof(SkillsController).GetMethod(nameof(SkillsController.CreateSkill));
        Assert.NotNull(method);

        var auth = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(auth);
        Assert.Equal("Admin", auth.Roles);
    }
}
