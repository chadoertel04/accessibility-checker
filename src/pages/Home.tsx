import GoogleMap from "@/components/GoogleMap";
import Layout from "@/components/Layout";

export default function Home() {
  return (
    <Layout>
      <h1 className="text-4xl font-extrabold dark:text-gray-400 py-2">
        Accessibility App
      </h1>
      <GoogleMap />
    </Layout>
  );
}
