<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Feedback Reporter Workbench</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; }
        .banner { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; }
    </style>
</head>
<body>
    <main>
        <h1>Feedback Reporter Workbench</h1>
        <p class="banner">
            Development-only page for testing the packaged Web Component. Take a screenshot with your device, then use the feedback button to upload and annotate it.
        </p>
    </main>

    <trust-feedback-reporter
        endpoint="{{ route('feedback-reporter.store') }}"
        availability-endpoint="{{ route('feedback-reporter.availability') }}"
        source-type="workbench"
        lang="en"
        color-scheme="auto"
    ></trust-feedback-reporter>

    <script type="importmap">
        { "imports": { "konva": "/workbench-assets/konva/index.js" } }
    </script>
    <script type="module">
        import { registerFeedbackReporterElement } from '/workbench-assets/dist/widget.js'

        registerFeedbackReporterElement()
    </script>
</body>
</html>
