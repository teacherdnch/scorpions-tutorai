const db = require('./index');

function setupDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teacher_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      created_by TEXT,
      is_used INTEGER DEFAULT 0,
      expires_at DATETIME,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      score INTEGER,
      total_questions INTEGER NOT NULL,
      completed_at DATETIME,
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      student_answer TEXT,
      explanation TEXT,
      topic TEXT,
      is_correct INTEGER,
      FOREIGN KEY(test_id) REFERENCES tests(id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      material TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS adaptive_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      current_skill REAL DEFAULT 5.0,
      questions_answered INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 10,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS adaptive_answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      student_answer TEXT,
      is_correct INTEGER,
      question_difficulty REAL NOT NULL,
      skill_before REAL NOT NULL,
      skill_after REAL NOT NULL,
      topic TEXT,
      explanation TEXT,
      FOREIGN KEY(session_id) REFERENCES adaptive_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS mentor_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      skill_level REAL,
      analysis_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cheat_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      question_number INTEGER,
      value_json TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES adaptive_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS anti_cheat_reports (
      session_id TEXT PRIMARY KEY,
      risk_index REAL NOT NULL DEFAULT 0,
      risk_level TEXT NOT NULL DEFAULT 'low',
      paste_events INTEGER DEFAULT 0,
      tab_switches INTEGER DEFAULT 0,
      speed_flags INTEGER DEFAULT 0,
      correctness_spike REAL DEFAULT 0,
      pattern_similarity REAL DEFAULT 0,
      avg_answer_time_ms REAL DEFAULT 0,
      min_answer_time_ms REAL DEFAULT 0,
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES adaptive_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS cognitive_profiles (
      session_id TEXT PRIMARY KEY,
      confidence_index REAL NOT NULL DEFAULT 0,
      stress_level REAL NOT NULL DEFAULT 0,
      profile_id TEXT NOT NULL DEFAULT 'BALANCED_LEARNER',
      profile_label TEXT,
      profile_emoji TEXT,
      profile_color TEXT,
      profile_desc TEXT,
      stats_json TEXT,
      breakdown_json TEXT,
      computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES adaptive_sessions(id)
    );
  `);

  // Idempotent column additions for existing DBs
  const tryAlter = (sql) => { try { db.exec(sql); } catch (_) { } };
  tryAlter(`ALTER TABLE adaptive_sessions ADD COLUMN risk_index REAL DEFAULT 0`);
  tryAlter(`ALTER TABLE adaptive_sessions ADD COLUMN risk_level TEXT DEFAULT 'low'`);
  // Cognitive analytics columns — safe to call on existing DBs
  tryAlter(`ALTER TABLE cheat_events ADD COLUMN event_source TEXT DEFAULT 'adaptive'`);

  console.log('Database schema initialized.');
}

module.exports = { setupDatabase };
