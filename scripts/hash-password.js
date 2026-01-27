#!/usr/bin/env node

/**
 * Password Hash Utility
 * 
 * Generates PBKDF2-HMAC-SHA256 password hashes for use with the auth-verify Edge Function.
 * 
 * Usage:
 *   node scripts/hash-password.js "YourPassword"
 * 
 * Output format: iterations$salt(base64)$hash(base64)
 * Example: 100000$aGVsbG93b3JsZA==$5K8n7N3M9P2Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9G==
 */

const crypto = require('crypto');

const ITERATIONS = 100000; // OWASP recommended minimum for PBKDF2
const HASH_LENGTH = 32;     // 32 bytes = 256 bits
const SALT_LENGTH = 16;     // 16 bytes = 128 bits

/**
 * Hash a password using PBKDF2-HMAC-SHA256
 * @param {string} password - The password to hash
 * @returns {Promise<string>} The hashed password in format: iterations$salt$hash
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Generate hash using PBKDF2
    crypto.pbkdf2(password, salt, ITERATIONS, HASH_LENGTH, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Convert salt and hash to base64
      const saltBase64 = salt.toString('base64');
      const hashBase64 = derivedKey.toString('base64');
      
      // Return in format: iterations$salt$hash
      resolve(`${ITERATIONS}$${saltBase64}$${hashBase64}`);
    });
  });
}

/**
 * Verify a password against a stored hash
 * @param {string} password - The password to verify
 * @param {string} storedHash - The stored hash in format: iterations$salt$hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split('$');
    if (parts.length !== 3) {
      reject(new Error('Invalid hash format'));
      return;
    }
    
    const iterations = parseInt(parts[0], 10);
    const salt = Buffer.from(parts[1], 'base64');
    const storedHashBytes = Buffer.from(parts[2], 'base64');
    
    crypto.pbkdf2(password, salt, iterations, HASH_LENGTH, 'sha256', (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Constant-time comparison to prevent timing attacks
      const match = crypto.timingSafeEqual(storedHashBytes, derivedKey);
      resolve(match);
    });
  });
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node hash-password.js "YourPassword"');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/hash-password.js "MySecretPassword123"');
    console.error('  node scripts/hash-password.js "admin@2024"');
    console.error('');
    console.error('The hash can then be stored in your admin_password table:');
    console.error('  UPDATE admin_password SET password_hash = \'100000$...$...\';');
    process.exit(1);
  }
  
  const password = args[0];
  
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    process.exit(1);
  }
  
  console.log('\n🔒 Generating secure password hash...\n');
  console.log(`Password: ${password}`);
  console.log(`Algorithm: PBKDF2-HMAC-SHA256`);
  console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
  console.log(`Hash length: ${HASH_LENGTH * 8} bits`);
  console.log(`Salt length: ${SALT_LENGTH * 8} bits\n`);
  
  try {
    const hash = await hashPassword(password);
    
    console.log('✅ Hash generated successfully!\n');
    console.log('📋 Copy this hash to your database:\n');
    console.log(`${hash}\n`);
    console.log('💾 SQL command to update admin_password table:\n');
    console.log(`UPDATE admin_password SET password_hash = '${hash}' WHERE id = (SELECT id FROM admin_password LIMIT 1);\n`);
    console.log('Or insert a new row:\n');
    console.log(`INSERT INTO admin_password (password_hash) VALUES ('${hash}');\n`);
    
    // Verify the hash works
    console.log('🔍 Verifying hash...');
    const isValid = await verifyPassword(password, hash);
    if (isValid) {
      console.log('✅ Verification successful! Hash is valid.\n');
    } else {
      console.error('❌ Verification failed! This should not happen.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export functions for use as a module
module.exports = {
  hashPassword,
  verifyPassword,
  ITERATIONS,
  HASH_LENGTH,
  SALT_LENGTH,
};
