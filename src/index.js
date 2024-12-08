import * as core from '@actions/core'
import * as github from '@actions/github'

(async () => {
    try {
        const repoOwner = core.getInput('repo-owner')
        const repoName = core.getInput('repo-name')
        const day = Number.parseInt(core.getInput('day'))
        const ignoreDraft = core.getBooleanInput('ignore-draft')

        // Get GitHub Personal Access Token from action workflow
        const gitHubToken = core.getInput('github-token')
        const octokit = github.getOctokit(gitHubToken)

        // Get Requested Reviewers
        const allOpenPullRequests = await octokit.rest.pulls.list({
            owner: repoOwner,
            repo: repoName
        })

        const now = new Date()
        const longStandingPullRequests = allOpenPullRequests.data
            .filter(it => !ignoreDraft || !it.draft)
            .filter(it => calculateBusinessDays(new Date(it.created_at), now) >= day)

        longStandingPullRequests
            .forEach(it => {
                const author = `@${it.user?.login}`
                const reviewers = it.requested_reviewers?.map(reviewer => `@${reviewer.login}`).join(", ")
                octokit.rest.issues.createComment({
                    owner: repoOwner,
                    repo: repoName,
                    issue_number: it.number,
                    body: `해당 PR이 오랫동안 머지되지 않고 있습니다. 확인 부탁드립니다. 작성자 : ${author} 리뷰어 : ${reviewers}`
                })
            })


    } catch (error) {
        console.log(error)
        core.setFailed(error.message)
    }
})()

function calculateBusinessDays(start, end) {
    let startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    let count = 0;
    let curDate = +startDate;
    while (curDate <= +endDate) {
        const dayOfWeek = new Date(curDate).getDay();
        const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
        if (!isWeekend) {
            count++;
        }
        curDate = curDate + 24 * 60 * 60 * 1000
    }
    return count;
}
