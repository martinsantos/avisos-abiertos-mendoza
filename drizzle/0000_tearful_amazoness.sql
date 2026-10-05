CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`batch` text NOT NULL,
	`metadata` text NOT NULL,
	`text` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`notice` text NOT NULL,
	`hash` text NOT NULL,
	`type` text NOT NULL,
	`bytes` integer NOT NULL,
	FOREIGN KEY (`notice`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`owner` text,
	`session` text NOT NULL,
	`idem` text NOT NULL,
	`digest` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`attachments` integer DEFAULT 0 NOT NULL,
	`prepared` text,
	`reference` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notices_idem_unique` ON `notices` (`idem`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
