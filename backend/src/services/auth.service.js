import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

/**
 * Generate a signed JWT for an authenticated user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Register a new user with bcrypt password hashing
 * Security: Public self-registration ALWAYS creates 'operator' accounts.
 * Administrator roles cannot be self-assigned via the public API.
 */
export const register = async ({ email, password, name }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Database error checking user existence: ${checkError.message}`);
  }

  if (existingUser) {
    const error = new Error('User with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password with bcrypt (10 rounds)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Security enforcement: Force 'operator' role on public registration
  const enforcedRole = 'operator';

  // Insert user record
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        email: normalizedEmail,
        password_hash: passwordHash,
        name: name.trim(),
        role: enforcedRole,
      },
    ])
    .select('id, email, name, role, created_at')
    .single();

  if (insertError) {
    throw new Error(`Failed to create user account: ${insertError.message}`);
  }

  // Generate auth token
  const token = generateToken(newUser);

  return {
    user: newUser,
    token,
  };
};

/**
 * Authenticate existing user with password verification
 */
export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Retrieve user record
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Database error fetching user: ${fetchError.message}`);
  }

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Verify bcrypt password hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Safe user profile without hash
  const userProfile = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
  };

  const token = generateToken(userProfile);

  return {
    user: userProfile,
    token,
  };
};

/**
 * Retrieve user profile by ID
 */
export const getUserById = async (id) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Database error fetching user by ID: ${error.message}`);
  }

  if (!user) {
    const notFoundError = new Error('User not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return user;
};

export default {
  generateToken,
  register,
  login,
  getUserById,
};
