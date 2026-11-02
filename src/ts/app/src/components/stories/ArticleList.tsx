import { MoveArticleForm } from "@/components/editor/MoveArticleForm";
import { Collapsible } from "@/components/ui/Collapsible";
import { Tag } from "@/components/ui/Tag";
import type { StoryArticle, StoryOption } from "@/lib/stories";
import { formatTime, listOutlets } from "@/lib/story-display";
import styles from "./ArticleList.module.css";

interface ArticleListProps {
  articles: StoryArticle[];
  /** For editors: flags, and a way to move each article. */
  edit?: {
    storyId: string;
    /** Articles the rating model judged to report a different event. */
    flagged: Set<string>;
    /** The day's other stories, which articles can move to. */
    targets: StoryOption[];
  };
}

/** The story's articles, each linking to the outlet's page. */
export function ArticleList({ articles, edit }: ArticleListProps) {
  return (
    <ol className={styles.articles}>
      {articles.map((article) => {
        const others = article.carriedBy.filter(
          (name) => name !== article.sourceName,
        );
        const isFlagged = edit?.flagged.has(article.id) ?? false;
        const placedByEditor = edit !== undefined && article.assignedBy === "editor";

        return (
          <li key={article.id} className={styles.article}>
            <h3 className={styles.title}>
              {article.url ? (
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title ?? "Untitled article"}
                </a>
              ) : (
                (article.title ?? "Untitled article")
              )}
            </h3>
            <p className={styles.meta}>
              <span className={styles.outlet}>
                {article.sourceName ?? "Unknown outlet"}
              </span>
              {article.publishedAt && (
                <span>{formatTime(article.publishedAt)}</span>
              )}
              {others.length > 0 && (
                <span>Also run word for word by {listOutlets(others)}</span>
              )}
            </p>
            {(isFlagged || placedByEditor) && (
              <p className={styles.tags}>
                {isFlagged && <Tag tone="warning">May report a different event</Tag>}
                {placedByEditor && <Tag>Placed by an editor</Tag>}
              </p>
            )}
            {article.description && (
              <p className={styles.description}>{article.description}</p>
            )}
            {edit && (
              <Collapsible summary="Move to another story" defaultOpen={isFlagged}>
                <MoveArticleForm
                  storyId={edit.storyId}
                  articleId={article.id}
                  targets={edit.targets}
                  canSplit={articles.length > 1}
                />
              </Collapsible>
            )}
          </li>
        );
      })}
    </ol>
  );
}
