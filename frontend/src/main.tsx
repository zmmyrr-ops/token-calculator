import { basePath } from "./base";
import { Component, useEffect, type ReactNode } from "react";
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
import Page14 from "./pages/scenarios/page";
import Page15 from "./pages/search/page";
import Page16 from "./pages/tools/[slug]/page";
import Page17 from "./pages/tools/page";
import Page18 from "./pages/tutorials/page";
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
  }, [location.pathname, location.search]);
  return (
    <Layout>
      <Seo />
      <ErrorBoundary
        key={
          location.pathname +
          (["/news", "/tutorials"].includes(location.pathname)
            ? ""
            : location.search)
        }
      >
        <Routes>
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
          <Route path="/scenarios" element={<Page14 />} />
          <Route
            path="/search"
            element={<Page15 searchParams={searchParams} />}
          />
          <Route path="/tools/:slug" element={<Page16 params={params} />} />
          <Route
            path="/tools"
            element={<Page17 searchParams={searchParams} />}
          />
          <Route path="/tutorials" element={<Page18 />} />
          <Route path="/updates" element={<Page19 />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}
function Entry() {
  const { pathname } = useLocation();
  return pathname.startsWith("/admin") ? (
    <Admin />
  ) : (
    <ContentProvider key={pathname}>
      <App />
    </ContentProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basePath}>
    <Entry />
  </BrowserRouter>,
);
