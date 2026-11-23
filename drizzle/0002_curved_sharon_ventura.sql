CREATE TABLE `chapters` (
	`id` varchar(30) NOT NULL,
	`topic_id` varchar(30),
	`subject_id` varchar(30),
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`),
	CONSTRAINT `topic_chapter_slug_idx` UNIQUE(`topic_id`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `user_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `bookmarks` MODIFY COLUMN `user_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `user_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_access` MODIFY COLUMN `user_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `topics` MODIFY COLUMN `subject_id` varchar(30);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `chapter_id` varchar(30);--> statement-breakpoint
ALTER TABLE `quizzes` ADD `topic_id` varchar(30);--> statement-breakpoint
ALTER TABLE `quizzes` ADD `chapter_id` varchar(30);