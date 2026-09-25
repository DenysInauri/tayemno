# Encryption Key Hierarchy

## Key Derivation

The user's private key is encrypted at rest. To decrypt it, a Key Encryption Key (KEK) is derived from the master password:

```
KEK = Argon2id(masterPassword, kdf_salt, {
  memory: kdf_memory_kib,
  iterations: kdf_iterations,
  parallelism: kdf_parallelism,
})
```

The KEK never leaves the client and is never sent to the server.

## Hierarchy

### Vault inside a folder

```
Master password + kdf_salt
  └── KEK (Argon2id)
        └── User private key (decrypted with KEK + private_key_nonce)
              └── Folder symmetric key (decrypted with User private key, from folder_members.encrypted_symmetric_key)
                    └── Vault symmetric key (decrypted with Folder key, from vaults.encrypted_symmetric_key + vaults.symmetric_key_nonce)
                          └── Vault content (decrypted with Vault key + content_nonce)
```

Note: `folders.encrypted_symmetric_key` is the admin master copy (encrypted with workspace admin public key). It is used by admins when granting folder access to other users, not for day-to-day decryption. Day-to-day decryption uses the per-user copy from `folder_members.encrypted_symmetric_key`.

### Standalone vault (no folder)

```
Master password + kdf_salt
  └── KEK (Argon2id)
        └── User private key (decrypted with KEK + private_key_nonce)
              └── Member workspace private key (decrypted with User private key, from workspace_members.encrypted_member_private_key)
                    └── Vault symmetric key (decrypted with Member workspace private key, sealed box from vaults.encrypted_symmetric_key)
                          └── Vault content (decrypted with Vault key + content_nonce)
```

## Workspace Roles

- **Owner**: Has both admin and member workspace private keys. Can create folders (which require the admin key) and access standalone vaults (which use the member key).
- **Admin**: Has both admin and member workspace private keys. Same key access as owner.
- **Member**: Has only the member workspace private key (`encrypted_admin_private_key` is null). Can access standalone vaults but cannot decrypt folder keys.

## Sharing (future)

When inviting a user to a workspace:
- The member workspace private key is encrypted with the invited user's public key and stored as a new row in `workspace_members`.
- For admin/owner roles, the admin workspace private key is also encrypted with the invited user's public key.
- Members can access standalone vaults. Admins/owners can additionally access all folders.

## Where keys are stored

| Key                                     | Storage                                             | Encrypted with                              |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| KEK                                     | Never stored (derived in memory)                    | N/A                                         |
| User private key                        | `users.encrypted_private_key`                       | KEK + `users.private_key_nonce`             |
| User public key                         | `users.public_key`                                  | Plaintext                                   |
| Admin workspace private key             | `workspace_members.encrypted_admin_private_key`     | User public key (sealed box, per member)    |
| Member workspace private key            | `workspace_members.encrypted_member_private_key`    | User public key (sealed box, per member)    |
| Admin workspace public key              | `workspaces.admin_public_key`                       | Plaintext                                   |
| Member workspace public key             | `workspaces.member_public_key`                      | Plaintext                                   |
| Folder symmetric key (admin master)     | `folders.encrypted_symmetric_key`                   | Admin workspace public key (sealed box)     |
| Folder symmetric key (per-user)         | `folder_members.encrypted_symmetric_key`            | User public key (sealed box, per member)    |
| Vault symmetric key (in folder)         | `vaults.encrypted_symmetric_key`                    | Folder symmetric key (XChaCha20-Poly1305, nonce in `vaults.symmetric_key_nonce`) |
| Vault symmetric key (standalone)        | `vaults.encrypted_symmetric_key`                    | Member workspace public key (sealed box, `vaults.symmetric_key_nonce` is null)   |
