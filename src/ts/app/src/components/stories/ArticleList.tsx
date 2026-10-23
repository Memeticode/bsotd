import { Collapsible } from "@/components/ui/Collapsible";
import { Tag } from "@/components/ui/Tag";
import type { StoryArticle, StoryOption } from "@/lib/stories";
import { formatTime, listOutlets } from "@/lib/story-display";
import { MoveArticleForm } from "./MoveArticleForm";
import styles from "./ArticleList.module.css";

interface ArticleListProps {
  storyId: string;
  articles: StoryArticle[];
  /** Articles the rating model judged to report a different event. */
  flagged: Set<string>;
  /** The day's other stories, which articles can move to. */
  targets: StoryOption[];
}

/** The story's articles, each with a way for editors to move it. */
export function ArticleList({
  storyId,
  articles,
  flagged,
  targets,
}: ArticleListProps) {
  return (
    <ol className={styles.articles}>
      {articles.map((article) => {
        const others = article.carriedBy.filter(
          (name) => name !== article.sourceName,
        );
        const isFlagged = flagged.has(article.id);

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
            {(isFlagged || article.assignedBy === "editor") && (
              <p className={styles.tags}>
                {isFlagged && <Tag tone="warning">May report a different event</Tag>}
                {article.assignedBy === "editor" && <Tag>Placed by an editor</Tag>}
              </p>
            )}
            {article.description && (
              <p className={styles.description}>{article.description}</p>
            )}
            <Collapsible summary="Move to another story" defaultOpen={isFlagged}>
              <MoveArticleForm
                storyId={storyId}
                articleId={article.id}
                targets={targets}
                canSplit={articles.length > 1}
              />
            </Collapsible>
          </li>
        );
      })}
    </ol>
  );
}
