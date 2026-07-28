import { describe, it, expect } from "vitest";
import argumentRoutes from "./argument.route.js";
import motionRoutes from "./motion.route.js";

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

describe("argument routes", () => {
  it("guards both post handlers with authMiddleware", () => {
    for (const path of ["/:id/arguments/affirmative", "/:id/arguments/negative"]) {
      expect(routeMiddlewareNames(argumentRoutes, "post", path)).toContain(
        "authMiddleware",
      );
    }
  });
});

describe("motion routes", () => {
  it("guards motion posting with authMiddleware", () => {
    expect(routeMiddlewareNames(motionRoutes, "post", "/")).toContain(
      "authMiddleware",
    );
  });
});

describe("llm-cost routes carry an extra limiter layer", () => {
  it("argument posts: authMiddleware then limiter then handler", () => {
    const names = routeMiddlewareNames(
      argumentRoutes,
      "post",
      "/:id/arguments/affirmative",
    );
    expect(names.length).toBe(3);
    expect(names[0]).toBe("authMiddleware");
  });
  it("motion post: authMiddleware then limiter then handler", () => {
    const names = routeMiddlewareNames(motionRoutes, "post", "/");
    expect(names.length).toBe(3);
    expect(names[0]).toBe("authMiddleware");
  });
});
