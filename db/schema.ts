import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const sessions=sqliteTable('sessions',{hash:text('hash').primaryKey(),expires:integer('expires').notNull(),count:integer('count').notNull().default(0)});
export const limits=sqliteTable('limits',{key:text('key').primaryKey(),count:integer('count').notNull()});
export const notices=sqliteTable('notices',{id:text('id').primaryKey(),secret:text('secret').notNull(),owner:text('owner'),session:text('session').notNull(),idem:text('idem').notNull().unique(),digest:text('digest').notNull(),data:text('data').notNull(),created:text('created').notNull(),attachments:integer('attachments').notNull().default(0),prepared:text('prepared'),reference:text('reference')});
export const evidence=sqliteTable('evidence',{id:text('id').primaryKey(),notice:text('notice').notNull().references(()=>notices.id),hash:text('hash').notNull(),type:text('type').notNull(),bytes:integer('bytes').notNull()});
export const documents=sqliteTable('documents',{id:text('id').primaryKey(),batch:text('batch').notNull(),metadata:text('metadata').notNull(),text:text('text').notNull()});
