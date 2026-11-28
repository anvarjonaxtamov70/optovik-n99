# Telegram customer authentication — staged implementation
User selected no paid SMS, using ordinary Telegram Bot API instead. Eskiz stays disabled; Telegram Gateway not used.
 
This commit provides only the transactional authentication core and synthetic tests. No routes, webhook, token issuer or client UI enabled. No real contacts or tokens collected.
 
Flow: mobile authenticated guest requests a short-lived random deep link with +998 number and explicit bind/login mode. Bot private chat asks for own contact. Backend matches sender and contact ID and exact requested phone. Bot returns one-time six-digit proof; user enters it in app. Atomic redemption creates three matching unique indexes (Telegram identity, phone, Firebase UID) for bind, or authorizes the existing UID for login. Server role check prohibits admins; login checks guest order history; client must also guard pending local attempts and use checkout mutex. No silent merges. Email-bound account must have verified email before binding (correct typo first); unverified email is not a safe recovery provider.
 
HMAC key (32 random bytes, server secret), 5-minute expiry, 5 guesses, 60-second cooldown, 100 challenges/day global staging cap, bounded challenge state; no raw phone, code or link token stored. A shared Telegram account proves control of that account/contact, not SIM ownership independently. Do not describe as SMS verification.
 
Next: add authenticated webhook with secret constant-time check, fixed Telegram endpoint and delivery errors; verify Firebase actor metadata from trusted lookup, issue short-lived Firebase custom token only for proven non-admin UID; mobile UI and explicit consent, pending-attempt guard, account recovery/sign-out for custom auth; test with real bot only after deployment authorization. Review remaining risks: webhook retry/lost response, account deletion/revocation, rate limits and quotas, migration for already-bound or changed number, no production activation.
 
Official references: https://core.telegram.org/bots/api ; https://core.telegram.org/bots/features ; https://firebase.google.com/docs/auth/admin/create-custom-tokens .
