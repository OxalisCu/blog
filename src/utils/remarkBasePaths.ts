type MarkdownNode = {
  type: string;
  url?: string;
  children?: MarkdownNode[];
};

/** Keep root-relative Markdown links and images under the site's base path. */
export function remarkBasePaths({ base }: { base: string }) {
  const prefix = base.replace(/\/+$/, "");

  return (tree: MarkdownNode) => {
    function walk(node: MarkdownNode) {
      if (
        ["image", "link", "definition"].includes(node.type) &&
        node.url?.startsWith("/") &&
        !node.url.startsWith("//") &&
        node.url !== prefix &&
        !node.url.startsWith(`${prefix}/`)
      ) {
        node.url = `${prefix}${node.url}`;
      }
      node.children?.forEach(walk);
    }

    walk(tree);
  };
}
