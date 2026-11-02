ALTER TABLE `attempts` MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'IN_PROGRESS';--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `request_id` varchar(191);--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `started_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `submitted_at` timestamp;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `total_questions` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `correct_count` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `wrong_count` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `unanswered_count` int NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` MODIFY COLUMN `time_taken_seconds` int;--> statement-breakpoint
ALTER TABLE `attempt_answers` MODIFY COLUMN `selected_option_id` varchar(30);--> statement-breakpoint
ALTER TABLE `attempt_answers` MODIFY COLUMN `is_correct` boolean;--> statement-breakpoint
ALTER TABLE `attempt_answers` MODIFY COLUMN `time_taken_seconds` int;--> statement-breakpoint
ALTER TABLE `attempt_answers` MODIFY COLUMN `answered_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `bookmarks` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `categories` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `categories` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `exams` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `exams` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exams` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `options` MODIFY COLUMN `image_url` varchar(500);--> statement-breakpoint
ALTER TABLE `options` MODIFY COLUMN `is_correct` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `options` MODIFY COLUMN `is_correct` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `options` MODIFY COLUMN `position` int NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `amount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'BDT';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `idempotency_key` varchar(191);--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paid_at` timestamp;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `provider_reference` varchar(191);--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `amount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'BDT';--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `paid_at` timestamp;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `topic_id` varchar(30);--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `explanation` text;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `difficulty` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `image_url` varchar(500);--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `is_active` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `status` varchar(20) NOT NULL DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `price` int NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'BDT';--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `duration_seconds` int;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `pass_percentage` double;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `shuffle_questions` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `shuffle_questions` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `shuffle_options` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `shuffle_options` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `max_attempts` int;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `published_at` timestamp;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `quiz_access` MODIFY COLUMN `order_id` varchar(30);--> statement-breakpoint
ALTER TABLE `quiz_access` MODIFY COLUMN `granted_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `quiz_access` MODIFY COLUMN `expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `quiz_questions` MODIFY COLUMN `position` int NOT NULL;--> statement-breakpoint
ALTER TABLE `quiz_questions` MODIFY COLUMN `marks` double;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(191);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(191);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(20) NOT NULL DEFAULT 'USER';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `is_active` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `attempts` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `attempt_answers` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `bookmarks` ADD PRIMARY KEY(`user_id`,`question_id`);--> statement-breakpoint
ALTER TABLE `categories` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `exams` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `options` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `orders` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `payments` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `questions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `quizzes` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `quiz_access` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD PRIMARY KEY(`quiz_id`,`question_id`);--> statement-breakpoint
ALTER TABLE `subjects` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `topics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `users` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `questions` ADD `type` varchar(30) DEFAULT 'single_choice' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `category_id` varchar(30);--> statement-breakpoint
ALTER TABLE `quizzes` ADD `deleted_at` timestamp;