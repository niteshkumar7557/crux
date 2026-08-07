import { describe, it, expect } from "vitest";
import argumentRoutes from "./argument.route.js";
import motionRoutes from "./motion.route.js";
import devMessageRoutes from "./devMessage.route.js";
import adminRoutes from "./admin.route.js";
import videoDebateRoutes from "./videoDebate.route.js";

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

function inheritedRouteMiddlewareNames(
  router: any,
  method: string,
  path: string,
): string[] {
  const routeIndex = router.stack.findIndex(
    (layer: any) => layer.route?.path === path && layer.route?.methods?.[method],
  );
  if (routeIndex === -1) return [];
  return [
    ...router.stack.slice(0, routeIndex).filter((layer: any) => !layer.route).map((layer: any) => layer.name),
    ...router.stack[routeIndex].route.stack.map((layer: any) => layer.name),
  ];
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
    expect(routeMiddlewareNames(devMessageRoutes, "post", "/").length).toBe(3);
    expect(routeMiddlewareNames(devMessageRoutes, "get", "/").length).toBe(2);
    expect(routeMiddlewareNames(devMessageRoutes, "post", "/read").length).toBe(2);
  });

  it("keeps the limiter after auth, so it can key on the user", () => {
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

describe("admin video debate routes", () => {
  it("admin video debate routes inherit authMiddleware and requireRole admin", () => {
    const routes: [string, string, string][] = [
      ["post", "/video-debates", "createVideoDebateDraft"],
      ["get", "/video-debates", "listAdminVideoDebates"],
      ["get", "/video-debates/:id", "getAdminVideoDebate"],
      ["patch", "/video-debates/:id/metadata", "patchVideoDebateMetadata"],
      ["post", "/video-debates/:id/media-version", "rotateVideoDebateMedia"],
      ["post", "/video-debates/:id/media/check", "checkVideoDebateMedia"],
      ["put", "/video-debates/:id/manifest", "putVideoDebateManifest"],
      ["post", "/video-debates/:id/validate", "validateVideoDebate"],
      ["get", "/video-debates/:id/preview", "previewVideoDebate"],
      ["post", "/video-debates/:id/publish", "publishVideoDebate"],
      ["post", "/video-debates/:id/unpublish", "unpublishVideoDebate"],
    ];

    for (const [method, path, handler] of routes) {
      const names = inheritedRouteMiddlewareNames(adminRoutes, method, path);
      expect(names.slice(0, 2), `${method.toUpperCase()} ${path}`).toEqual([
        "authMiddleware",
        "<anonymous>",
      ]);
      expect(names).toEqual(["authMiddleware", "<anonymous>", handler]);
    }

    const requireAdminLayer = adminRoutes.stack[1];
    if (!requireAdminLayer) throw new Error("admin role guard missing");
    const requireAdmin: any = requireAdminLayer.handle;
    let status = 200;
    let nextCalled = false;
    const res = { status(code: number) { status = code; return res; }, json() { return res; } };
    requireAdmin({ user: { id: 1, email: "user@example.test", role: "user" } }, res, () => { nextCalled = true; });
    expect(status).toBe(403);
    expect(nextCalled).toBe(false);
    requireAdmin({ user: { id: 2, email: "admin@example.test", role: "admin" } }, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    // The only unguarded non-GET routes are the password gate itself and log-only
    // playback telemetry: neither writes a row or touches publication state. Every
    // route that can change what is published lives behind the admin guard above.
    const publicMutations = videoDebateRoutes.stack
      .filter((layer: any) => layer.route && Object.keys(layer.route.methods).some((method) => method !== "get"))
      .map((layer: any) => `${Object.keys(layer.route.methods).join(",")} ${layer.route.path}`);
    expect(publicMutations).toEqual(["post /access", "post /:slug/playback-events"]);
  });
});

describe("public video debate routes", () => {
  it("guards every public route with requireVideoPass, and leaves /access open", () => {
    const gated: [string, string][] = [
      ["get", "/"],
      ["get", "/sitemap"],
      ["get", "/:slug"],
      ["get", "/:slug/captions.vtt"],
      ["post", "/:slug/playback-events"],
    ];
    for (const [method, path] of gated) {
      const names = routeMiddlewareNames(videoDebateRoutes, method, path);
      expect(names[0], `${method.toUpperCase()} ${path}`).toBe("requireVideoPass");
    }

    // The gate itself cannot sit behind the gate.
    const access = routeMiddlewareNames(videoDebateRoutes, "post", "/access");
    expect(access).not.toContain("requireVideoPass");
    expect(access).toContain("postVideoDebateAccess");
  });
});
