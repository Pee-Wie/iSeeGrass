🔍 Checking Status & Logs
• git status: Shows modified files, staged changes, and untracked files.
• git log --oneline --graph --decorate: Displays a clean, visual history tree of your commits.
• git diff: Shows exact line changes in your unstaged files.
📥 Managing Changes (Stage & Commit)
• git add .: Stages all changed and new files for the next commit.
• git add -p: Interactive staging. Lets you review and stage changes line-by-line.
• git commit -m "your message": Commits staged changes with a descriptive message.
• git commit --amend --no-edit: Adds new changes to your very last commit without changing the commit message.
🌿 Branching & Merging
• git switch -c <branch-name>: Creates a new branch and immediately switches to it.
• git switch <branch-name>: Switches back to an existing branch.
• git branch -a: Lists all local and remote branches.
• git merge <branch-name>: Merges the specified branch into your current active branch.
☁️ Syncing with Cloud Repos (GitHub / GitLab)
• git fetch origin: Downloads latest updates from the cloud without modifying your local files.
• git pull origin <branch-name>: Fetches updates and instantly merges them into your local branch.
• git push origin <branch-name>: Uploads your local commits to the cloud.
🧹 Cleaning Up & Saving Work (Stash)
• git stash: Temporarily shelves your uncommitted changes so you can work on a clean slate.
• git stash pop: Restores your latest shelved changes back to your workspace.
• git clean -fd: Forcefully deletes all untracked files and directories from your local folder.
🚨 Fixing Mistakes (Undo Commands)
• git restore <file>: Discards local, uncommitted changes in a file (reverts it to the last commit).
• git reset HEAD~1 --soft: Undoes your last commit but leaves your changes staged in your code editor.
• git reset HEAD~1 --hard: Danger zone. Completely wipes your last commit and deletes all code changes associated with it.
