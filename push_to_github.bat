@echo off
echo Committing and pushing changes to GitHub...
git add .
git commit -m "Fix CORS: allow X-Client-Device-ID header for Netlify requests"
git pull origin main
git push origin main
echo Done!
pause
