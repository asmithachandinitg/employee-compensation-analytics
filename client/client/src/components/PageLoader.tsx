
import "./PageLoader.css";

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({
  message = "Please wait...",
}: PageLoaderProps) {
  return (
    <div className="page-loader">
      <div className="loader-animation">
        <div className="loader-ring" />
        <div className="loader-ring-inner" />
        <div className="loader-dot" />
      </div>

      <p>{message}</p>
    </div>
  );
}
