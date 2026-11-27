import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("faq");

export default function Page() {
  return <CmsPageView slug="faq" />;
}
