import argon2 from "argon2";

export const hashPassword = async (plainPassword: string) =>
  argon2.hash(plainPassword, {
    type: argon2.argon2id,
  });

export const verifyPassword = async (
  passwordHash: string,
  plainPassword: string,
) => argon2.verify(passwordHash, plainPassword);
