import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfigWithoutDatabase = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const DB_NAME = process.env.DB_NAME || 'pathpilot_vsuite_db';

async function initDatabase() {
  console.log('🔧 Initializing database...');

  // 1. Connect without specifying database first to create it
  const tempConnection = await mysql.createConnection(dbConfigWithoutDatabase);
  
  try {
    console.log(`📦 Creating database "${DB_NAME}" (if not exists)...`);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.execute(`USE \`${DB_NAME}\`;`);

    // 2. Create tables in relational order (no foreign key dependencies first)
    console.log('📄 Creating tables...');

    // Users table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('student', 'mentor', 'admin') NOT NULL,
        specialty VARCHAR(255) NOT NULL,
        bio TEXT DEFAULT '',
        skills JSON DEFAULT ('[]'),
        avatarUrl VARCHAR(255) DEFAULT '',
        targetJob VARCHAR(255) NULL,
        company VARCHAR(255) NULL,
        experience INT NULL,
        hourlyRate DECIMAL(10,2) NULL,
        isAiBacked BOOLEAN DEFAULT FALSE,
        rating DECIMAL(3,2) DEFAULT 0,
        reviewCount INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_specialty (specialty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Mentor availability table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS mentor_availability (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        mentorId VARCHAR(36) NOT NULL,
        dayOfWeek INT NOT NULL,
        startTime VARCHAR(10) NOT NULL,
        endTime VARCHAR(10) NOT NULL,
        timezone VARCHAR(50) NOT NULL,
        label VARCHAR(255) NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mentorId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_mentorId (mentorId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Mentor approvals table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS mentor_approvals (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        mentorId VARCHAR(36) NOT NULL UNIQUE,
        status ENUM('pending_review', 'approved', 'rejected') DEFAULT 'pending_review',
        reviewedBy VARCHAR(36) NULL,
        reviewNote TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mentorId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Sessions table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        mentorId VARCHAR(36) NOT NULL,
        studentId VARCHAR(36) NOT NULL,
        availabilitySlotId VARCHAR(36) NULL,
        mentorName VARCHAR(255) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        mentorAvatarUrl VARCHAR(255) DEFAULT '',
        studentAvatarUrl VARCHAR(255) DEFAULT '',
        scheduledAt DATETIME NOT NULL,
        durationMinutes INT DEFAULT 60,
        status ENUM('pending', 'approved', 'declined') DEFAULT 'pending',
        topic TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mentorId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (availabilitySlotId) REFERENCES mentor_availability(id) ON DELETE SET NULL,
        INDEX idx_mentorId (mentorId),
        INDEX idx_studentId (studentId),
        INDEX idx_status (status),
        INDEX idx_mentor_scheduled (mentorId, scheduledAt),
        INDEX idx_mentor_status_scheduled (mentorId, status, scheduledAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Messages table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        chatId VARCHAR(255) NOT NULL,
        senderId VARCHAR(36) NOT NULL,
        sessionId VARCHAR(36) NULL,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE SET NULL,
        INDEX idx_chat_timestamp (chatId, timestamp),
        INDEX idx_senderId (senderId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Reviews table
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        mentorId VARCHAR(36) NOT NULL,
        studentId VARCHAR(36) NOT NULL,
        sessionId VARCHAR(36) NOT NULL,
        rating DECIMAL(3,2) NOT NULL,
        comment TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mentorId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE RESTRICT,
        UNIQUE KEY idx_student_session (studentId, sessionId),
        INDEX idx_mentorId (mentorId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Matches cache table (mentee ↔ mentor AI compatibility scores)
    await tempConnection.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id          VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
        menteeId    VARCHAR(36)   NOT NULL,
        mentorId    VARCHAR(36)   NOT NULL,
        score       INT           NOT NULL,
        rationale   TEXT          NOT NULL,
        createdAt   DATETIME      DEFAULT CURRENT_TIMESTAMP,
        updatedAt   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY  uq_mentee_mentor (menteeId, mentorId),
        INDEX       idx_menteeId (menteeId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await tempConnection.end();
  }
}

initDatabase();
