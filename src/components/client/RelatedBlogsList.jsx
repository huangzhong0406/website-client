"use client";

/**
 * 相关博客列表组件（客户端）
 * 提供点击跳转交互
 */
export default function RelatedBlogsList({blogs}) {
  if (!blogs || blogs.length === 0) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", {month: "short"}).toUpperCase();
    return `${day} ${month}`;
  };

  const handleClick = (path) => {
    if (path) {
      window.location.href = path;
    }
  };

  return (
    <div className="bd-related">
      <h2 className="bd-related-title">Related News</h2>
      <div className="bd-related-list">
        {blogs.map((blog) => (
          <div
            key={blog.id || blog.path}
            className="bd-related-item"
            style={{cursor: "pointer"}}
            onClick={() => handleClick(blog.path)}
          >
            <div className="bd-related-image">
              <img
                src={blog.primary_image || "/images/placeholder.jpg"}
                alt={blog.name || "Blog"}
                loading="lazy"
              />
            </div>
            <div className="bd-related-date">
              {formatDate(blog.published_at || blog.created_at)}
            </div>
            <h3 className="bd-related-title">{blog.name || "Untitled"}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
