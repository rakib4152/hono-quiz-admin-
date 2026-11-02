-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `attempts` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`quiz_id` varchar(30) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT '''IN_PROGRESS''',
	`request_id` varchar(191) DEFAULT 'NULL',
	`started_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`submitted_at` timestamp DEFAULT 'NULL',
	`expires_at` timestamp DEFAULT 'NULL',
	`total_questions` int(11) NOT NULL,
	`correct_count` int(11) NOT NULL DEFAULT 0,
	`wrong_count` int(11) NOT NULL DEFAULT 0,
	`unanswered_count` int(11) NOT NULL DEFAULT 0,
	`score` double NOT NULL DEFAULT 0,
	`max_score` double NOT NULL DEFAULT 0,
	`percentage` double NOT NULL DEFAULT 0,
	`time_taken_seconds` int(11) DEFAULT 'NULL',
	CONSTRAINT `attempts_request_id_unique` UNIQUE(`request_id`),
	CONSTRAINT `attempt_req_idx` UNIQUE(`request_id`)
);
--> statement-breakpoint
CREATE TABLE `attempt_answers` (
	`id` varchar(30) NOT NULL,
	`attempt_id` varchar(30) NOT NULL,
	`question_id` varchar(30) NOT NULL,
	`selected_option_id` varchar(30) DEFAULT 'NULL',
	`is_correct` tinyint(1) DEFAULT 'NULL',
	`marks_awarded` double NOT NULL DEFAULT 0,
	`time_taken_seconds` int(11) DEFAULT 'NULL',
	`answered_at` timestamp NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`user_id` varchar(30) NOT NULL,
	`question_id` varchar(30) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(30) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`updated_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `cat_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` varchar(30) NOT NULL,
	`category_id` varchar(30) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text DEFAULT 'NULL',
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`updated_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `cat_exam_slug_idx` UNIQUE(`category_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `options` (
	`id` varchar(30) NOT NULL,
	`question_id` varchar(30) NOT NULL,
	`text` text NOT NULL,
	`image_url` varchar(500) DEFAULT 'NULL',
	`is_correct` tinyint(1) NOT NULL DEFAULT 0,
	`position` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`quiz_id` varchar(30) NOT NULL,
	`amount` int(11) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT '''BDT''',
	`status` varchar(20) NOT NULL DEFAULT '''PENDING''',
	`idempotency_key` varchar(191) DEFAULT 'NULL',
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`paid_at` timestamp DEFAULT 'NULL',
	CONSTRAINT `orders_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(30) NOT NULL,
	`order_id` varchar(30) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_reference` varchar(191) DEFAULT 'NULL',
	`status` varchar(20) NOT NULL DEFAULT '''PENDING''',
	`amount` int(11) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT '''BDT''',
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`paid_at` timestamp DEFAULT 'NULL',
	CONSTRAINT `payments_provider_reference_unique` UNIQUE(`provider_reference`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` varchar(30) NOT NULL,
	`subject_id` varchar(30) NOT NULL,
	`topic_id` varchar(30) DEFAULT 'NULL',
	`body` text NOT NULL,
	`explanation` text DEFAULT 'NULL',
	`difficulty` int(11) NOT NULL DEFAULT 1,
	`marks` double NOT NULL DEFAULT 1,
	`image_url` varchar(500) DEFAULT 'NULL',
	`is_active` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`updated_at` timestamp NOT NULL DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` varchar(30) NOT NULL,
	`exam_id` varchar(30) NOT NULL,
	`title` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text DEFAULT 'NULL',
	`status` varchar(20) NOT NULL DEFAULT '''DRAFT''',
	`price` int(11) NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT '''BDT''',
	`duration_seconds` int(11) DEFAULT 'NULL',
	`pass_percentage` double DEFAULT 'NULL',
	`shuffle_questions` tinyint(1) NOT NULL DEFAULT 0,
	`shuffle_options` tinyint(1) NOT NULL DEFAULT 0,
	`negative_mark` double NOT NULL DEFAULT 0,
	`max_attempts` int(11) DEFAULT 'NULL',
	`published_at` timestamp DEFAULT 'NULL',
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`updated_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `exam_quiz_slug_idx` UNIQUE(`exam_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `quiz_access` (
	`id` varchar(30) NOT NULL,
	`user_id` varchar(30) NOT NULL,
	`quiz_id` varchar(30) NOT NULL,
	`order_id` varchar(30) DEFAULT 'NULL',
	`granted_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`expires_at` timestamp DEFAULT 'NULL',
	CONSTRAINT `user_quiz_access_idx` UNIQUE(`user_id`,`quiz_id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`quiz_id` varchar(30) NOT NULL,
	`question_id` varchar(30) NOT NULL,
	`position` int(11) NOT NULL,
	`marks` double DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` varchar(30) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	CONSTRAINT `subjects_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(30) NOT NULL,
	`subject_id` varchar(30) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	CONSTRAINT `sub_topic_slug_idx` UNIQUE(`subject_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(30) NOT NULL,
	`name` varchar(191) DEFAULT 'NULL',
	`email` varchar(191) DEFAULT 'NULL',
	`password_hash` varchar(255) DEFAULT 'NULL',
	`role` varchar(20) NOT NULL DEFAULT '''USER''',
	`is_active` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	`updated_at` timestamp NOT NULL DEFAULT 'current_timestamp()',
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `email_idx` UNIQUE(`email`)
);

*/