import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("contact");

export default function Page() {
  return <CmsPageView slug="contact" />;
}
