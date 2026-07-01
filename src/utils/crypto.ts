/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hash un mot de passe de manière sécurisée en utilisant SHA-256 avec un sel statique.
 * @param password Le mot de passe en clair
 * @returns Le hash hexadécimal
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const encoder = new TextEncoder();
  const salt = 'PentaGadCRM_Salt_2026_SecureKey';
  const data = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
