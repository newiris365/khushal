@echo off
echo Committing and pushing changes to GitHub...
git add .
git commit -m "Add Render backend proxy and canteen Netlify function for production"
git pull origin main
git push origin main
echo Done!
pause
