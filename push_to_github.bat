@echo off
echo Committing and pushing changes to GitHub...
git add .
git commit -m "Fix wallet fallback ID and remove Netlify Next.js plugin to fix build"
git pull origin main
git push origin main
echo Done!
pause
