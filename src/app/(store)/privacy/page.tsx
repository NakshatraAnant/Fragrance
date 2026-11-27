import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("privacy");

export default function Page() {
  return <CmsPageView slug="privacy" />;
}
