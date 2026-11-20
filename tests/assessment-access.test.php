<?php

require_once __DIR__ . '/../core/app/models/AssessmentModel.php';

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(
    "CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        position TEXT,
        role TEXT
    )"
);
$pdo->exec(
    "CREATE TABLE assessments (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
    )"
);

$insertUser = $pdo->prepare(
    'INSERT INTO users (id, first_name, last_name, username, position, role)
     VALUES (?, ?, ?, ?, ?, ?)'
);
$users = [
    [1, 'Rae', 'Researcher', 'rae', 'Researcher', 'user'],
    [2, 'Sam', 'Student', 'sam', 'Student', 'user'],
    [3, 'Pat', 'Researcher', 'pat', 'Researcher', 'user'],
    [4, 'Ari', 'Admin', 'ari', 'Student', 'admin'],
];
foreach ($users as $user) {
    $insertUser->execute($user);
}

$insertAssessment = $pdo->prepare(
    'INSERT INTO assessments (id, user_id, title, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$assessments = [
    [1, 1, 'Researcher draft', '', 'draft', '2025-01-01', '2025-01-01'],
    [2, 2, 'Student finalized', '', 'finalized', '2025-01-02', '2025-01-02'],
    [3, 3, 'Other researcher', '', 'draft', '2025-01-03', '2025-01-03'],
    [4, 4, 'Admin record', '', 'draft', '2025-01-04', '2025-01-04'],
    [5, 2, 'Student in progress', '', 'in_progress', '2025-01-05', '2025-01-05'],
];
foreach ($assessments as $assessment) {
    $insertAssessment->execute($assessment);
}

$model = new AssessmentModel($pdo);
$researcher = ['id' => 1, 'role' => 'user', 'position' => 'Researcher'];
$rows = $model->getForResearcher(1, [], 20, 0);
$ids = array_map(static fn(array $row): int => (int) $row['id'], $rows);
sort($ids);
expect($ids === [1, 2, 5], 'Researchers should see their assessments and student assessments only.');
expect($model->countForResearcher(1) === 3, 'Researcher assessment count should match visible records.');

$studentRecord = $model->findById(2);
$ownDraft = $model->findById(1);
$otherResearcherRecord = $model->findById(3);
$finalizedStudent = $model->findById(2);
$admin = ['id' => 4, 'role' => 'admin', 'position' => 'Admin'];

expect(AssessmentModel::canView($studentRecord, $researcher), 'Researchers should be able to view student assessments.');
expect(!AssessmentModel::canView($otherResearcherRecord, $researcher), 'Researchers must not see other researchers records.');
expect(AssessmentModel::viewerGroup($studentRecord, $researcher) === 'students', 'Shared student work should be grouped separately.');
expect(!AssessmentModel::canEdit($studentRecord, $researcher), 'Researchers must not edit student assessments.');
expect(!AssessmentModel::canDelete($studentRecord, $researcher), 'Researchers must not delete student assessments.');
expect(AssessmentModel::canEdit($ownDraft, $researcher), 'Researchers should be able to edit their own drafts.');
expect(AssessmentModel::canDelete($ownDraft, $researcher), 'Researchers should be able to delete their own drafts.');
expect(!AssessmentModel::canEdit($finalizedStudent, ['id' => 2, 'role' => 'user']), 'Finalized assessments must be read-only for their owners.');
expect(!AssessmentModel::canDelete($finalizedStudent, ['id' => 2, 'role' => 'user']), 'Owners must not delete finalized assessments.');
expect(AssessmentModel::canDelete($finalizedStudent, $admin), 'Admins should retain delete access to finalized assessments.');

echo "Assessment access tests passed.\n";
