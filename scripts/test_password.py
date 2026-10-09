from app.core.security import hash_password, verify_password

password = "MySecurePassword123!"

password_hash = hash_password(password)

print("Hash:", password_hash)
print("Valid:", verify_password(password, password_hash))
print("Invalid:", verify_password("WrongPassword", password_hash))