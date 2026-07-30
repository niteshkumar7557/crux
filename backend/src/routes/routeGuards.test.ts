import { describe, it, expect } from "vitest";
import argumentRoutes from "./argument.route.js";
import motionRoutes from "./motion.route.js";
import devMessageRoutes from "./devMessage.route.js";

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

describe("dev message routes", () => {
  // There is no anonymous thread: the user id comes from the token, so an
  // unguarded route here would let a caller read or write someone else's.
  it("guards all three routes with authMiddleware first", () => {
    const routes: [string, string][] = [
      ["get", "/"],
      ["post", "/"],
      ["post", "/read"],
    ];
    for (const [method, path] of routes) {
      const names = routeMiddlewareNames(devMessageRoutes, method, path);
      expect(names[0]).toBe("authMiddleware");
    }
  });

  it("gives POST / a limiter layer, and the reads none", () => {
    // The write is the one that relays to Telegram, so it is the one that can
    // flood an inbox. auth → limiter → handler.
    expect(routeMiddlewareNames(devMessageRoutes, "post", "/").length).toBe(3);
    expect(routeMiddlewareNames(devMessageRoutes, "get", "/").length).toBe(2);
    expect(routeMiddlewareNames(devMessageRoutes, "post", "/read").length).toBe(2);
  });

  it("keeps the limiter after auth, so it can key on the user", () => {
    // byUser reads req.user.id — set by authMiddleware. Swapping the order
    // would silently downgrade every DM limit to a shared IP bucket.
    const names = routeMiddlewareNames(devMessageRoutes, "post", "/");
    expect(names.indexOf("authMiddleware")).toBeLessThan(names.length - 1);
    expect(names[0]).toBe("authMiddleware");
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
