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
              │
              ├── Folder symmetric key (encrypted with User public key, stored in folder_key_shares)
              │     └── Vault symmetric key (encrypted with Folder key, stored in vaults.symmetricKey)
              │           └── Vault content (encrypted with Vault key)
              │
              └── User public key (plaintext, stored in users.public_key)
```

### Standalone vault (no folder)

```
Master password + kdf_salt
  └── KEK (Argon2id)
        └── User private key (decrypted with KEK + private_key_nonce)
              └── Vault symmetric key (encrypted with User public key, stored in vault_key_shares)
                    └── Vault content (encrypted with Vault key)
```

## Sharing

When sharing a folder or standalone vault with another user:

- **Folder**: the folder symmetric key is re-encrypted with the recipient's public key and stored as a new row in `folder_key_shares`. The recipient can then decrypt all vaults inside the folder.
- **Standalone vault**: the vault symmetric key is re-encrypted with the recipient's public key and stored as a new row in `vault_key_shares`.

## Where keys are stored

| Key | Storage | Encrypted with |
|-----|---------|----------------|
| KEK | Never stored (derived in memory) | N/A |
| User private key | `users.encrypted_private_key` | KEK |
| User public key | `users.public_key` | Plaintext |
| Folder symmetric key | `folder_key_shares.symmetric_key` | User public key (per user) |
| Vault symmetric key (in folder) | `vaults.symmetric_key` | Folder symmetric key |
| Vault symmetric key (standalone) | `vault_key_shares.symmetric_key` | User public key (per user) |
