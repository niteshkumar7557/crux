import { describe, it, expect } from "vitest";
import commentRoutes from "./comment.route.js";
import argumentRoutes from "./argument.route.js";

// Express 5 router internals: router.stack -> layers; layer.route.path,
// layer.route.stack[n].name is the handler function's name.
export function routeMiddlewareNames(
  router: any,
  method: string,
  path: string,
): string[] {
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  );
  return layer ? layer.route.stack.map((s: any) => s.name) : [];
}

describe("comment routes", () => {
  it("guards both post handlers with authMiddleware", () => {
    for (const path of ["/affirmative/:id", "/negative/:id"]) {
      expect(routeMiddlewareNames(commentRoutes, "post", path)).toContain(
        "authMiddleware",
      );
    }
  });
});

describe("argument routes", () => {
  it("guards statement posting with authMiddleware", () => {
    expect(routeMiddlewareNames(argumentRoutes, "post", "/")).toContain(
      "authMiddleware",
    );
  });
});

describe("llm-cost routes carry an extra limiter layer", () => {
  it("comment posts: authMiddleware then limiter then handler", () => {
    const names = routeMiddlewareNames(
      commentRoutes,
      "post",
      "/affirmative/:id",
    );
    expect(names.length).toBe(3);
    expect(names[0]).toBe("authMiddleware");
  });
  it("argument post: authMiddleware then limiter then handler", () => {
    const names = routeMiddlewareNames(argumentRoutes, "post", "/");
    expect(names.length).toBe(3);
    expect(names[0]).toBe("authMiddleware");
  });
});
