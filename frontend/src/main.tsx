import Workspace, { PromptPage, ProjectPage, TaskPacks } from "./workspace/Workspace";
const AiEyes = lazy(() => import("./ai-eyes/AiEyes"));
import EyesAdmin from "./ai-eyes/Admin";
import Personas from "./Personas";
import PersonasAdmin from "./admin/PersonasAdmin";
import {
  CommunityProvider,
  Forum,
  UserAuth,
  Account,
  NewPost,
  PostDetail,
  CommunityRules,
} from "./Community";
import Analytics from "./Analytics";
import { basePath } from "./base";
import { Component, useEffect, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ContentProvider } from "./content";
import Layout from "./Layout";
import Admin from "./admin/Admin";
import Seo from "./Seo";
import NotFound from "./pages/not-found";
import News from "./News";
import Page0 from "./pages/about/page";
import Page1 from "./pages/calculators/media/page";
import Page2 from "./pages/calculators/page";
import Page3 from "./pages/calculators/tokens/page";
import Page4 from "./pages/compare/page";
import Page5 from "./pages/how-it-works/page";
import Page6 from "./pages/learn/[slug]/page";
import Page7 from "./pages/learn/page";
import Page8 from "./pages/models/[slug]/page";
import Page9 from "./pages/models/page";
import Page10 from "./pages/page";
import Page11 from "./pages/privacy/page";
import Page12 from "./pages/saved/page";
import Page13 from "./pages/scenarios/[slug]/page";
import { Navigate } from "react-router-dom";
import Page15 from "./pages/search/page";
import Page16 from "./pages/tools/[slug]/page";
import Page17 from "./pages/tools/page";

import Page19 from "./pages/updates/page";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="page-intro">
        <h1>页面加载失败</h1>
        <button className="button" onClick={() => location.reload()}>
          重新加载
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const location = useLocation();
  const params = {
    slug: location.pathname.split("/").pop() || "",
  };
  const query = new URLSearchParams(location.search);
  const searchParams: Record<string, string> = Object.fromEntries(query);
  // Repeated checkbox ids are preserved as a comma-separated list.
  if (query.getAll("ids").length > 1)
    searchParams.ids = query.getAll("ids").join(",");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname !== "/personas") window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  return (
    <Layout>
      <Seo />
      <ErrorBoundary
        key={
          (location.pathname.startsWith("/ai-eyes") ? "/ai-eyes" : location.pathname) +
          (["/news", "/tutorials", "/personas"].includes(location.pathname)
            ? ""
            : location.search)
        }
      >
        <Suspense fallback={<p role="status">正在加载功能…</p>}><Routes>
          <Route path="/ai-eyes" element={<AiEyes />} />
          <Route path="/ai-eyes/types" element={<Navigate replace to="/ai-eyes" />} />
          <Route path="/ai-eyes/runs/:id" element={<AiEyes />} />
          <Route path="/ai-eyes/s/:id" element={<AiEyes />} />
          <Route path="/ai-eyes/claim" element={<AiEyes />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/workspace/prompts/:id" element={<PromptPage />} />
          <Route path="/workspace/projects/:id" element={<ProjectPage />} />
          <Route path="/task-packs" element={<TaskPacks />} />
          <Route path="/task-packs/:id" element={<TaskPacks />} />
          <Route path="/personas" element={<Personas />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/forum/new" element={<NewPost />} />
          <Route path="/forum/:id" element={<PostDetail />} />
          <Route path="/login" element={<UserAuth />} />
          <Route path="/register" element={<UserAuth register />} />
          <Route path="/account" element={<Account />} />
          <Route path="/community-rules" element={<CommunityRules />} />
          <Route path="/about" element={<Page0 />} />
          <Route path="/calculators/media" element={<Page1 />} />
          <Route path="/calculators" element={<Page2 />} />
          <Route path="/calculators/tokens" element={<Page3 />} />
          <Route
            path="/compare"
            element={<Page4 searchParams={searchParams} />}
          />
          <Route path="/how-it-works" element={<Page5 />} />
          <Route path="/learn/:slug" element={<Page6 params={params} />} />
          <Route
            path="/learn"
            element={<Page7 searchParams={searchParams} />}
          />
          <Route path="/models/:slug" element={<Page8 params={params} />} />
          <Route
            path="/models"
            element={<Page9 searchParams={searchParams} />}
          />
          <Route path="/" element={<Page10 />} />
          <Route path="/privacy" element={<Page11 />} />
          <Route path="/saved" element={<Page12 />} />
          <Route path="/scenarios/:slug" element={<Page13 params={params} />} />
          <Route
            path="/scenarios"
            element={<Navigate replace to="/learn?format=scenarios" />}
          />
          <Route
            path="/search"
            element={<Page15 searchParams={searchParams} />}
          />
          <Route path="/tools/:slug" element={<Page16 params={params} />} />
          <Route
            path="/tools"
            element={<Page17 searchParams={searchParams} />}
          />
          <Route
            path="/tutorials"
            element={<Navigate replace to="/learn?format=practice" />}
          />
          <Route path="/updates" element={<Page19 />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
function Entry() {
  const { pathname } = useLocation();
  return pathname === "/admin/ai-eyes" ? (
    <EyesAdmin />
  ) : pathname === "/admin/personas" ? (
    <PersonasAdmin />
  ) : pathname.startsWith("/admin") ? (
    <Admin />
  ) : (
    <CommunityProvider>
      <Analytics />
      <ContentProvider key={pathname}>
        <App />
      </ContentProvider>
    </CommunityProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basePath}>
    <Entry />
  </BrowserRouter>,
);
