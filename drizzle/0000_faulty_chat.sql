CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`tagline` text,
	`description` text,
	`repo_owner` text NOT NULL,
	`repo_name` text NOT NULL,
	`repo_url` text NOT NULL,
	`website_url` text,
	`favicon_url` text,
	`screenshot_url` text,
	`language` text,
	`engine` text,
	`license` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`contributors` integer DEFAULT 0 NOT NULL,
	`forks` integer DEFAULT 0 NOT NULL,
	`watchers` integer DEFAULT 0 NOT NULL,
	`last_commit_at` integer,
	`health_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_language_idx` ON `projects` (`language`);--> statement-breakpoint
CREATE INDEX `projects_engine_idx` ON `projects` (`engine`);--> statement-breakpoint
CREATE INDEX `projects_stars_idx` ON `projects` (`stars`);--> statement-breakpoint
CREATE INDEX `projects_health_score_idx` ON `projects` (`health_score`);--> statement-breakpoint
CREATE INDEX `projects_last_commit_at_idx` ON `projects` (`last_commit_at`);