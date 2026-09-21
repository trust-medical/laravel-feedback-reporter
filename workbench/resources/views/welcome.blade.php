<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Feedback Reporter Workbench (Development Only)</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
        .banner { background: #fff3cd; color: #856404; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: bold; margin-bottom: 6px; }
        textarea, input[type="text"] { width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 4px; cursor: pointer; font-size: 15px; }
        button:disabled { background: #93c5fd; cursor: not-allowed; }
        .redacted-box { background: #f1f5f9; padding: 10px; border: 1px dashed #cbd5e1; margin-bottom: 15px; border-radius: 4px; }
        .ignore-box { background: #fef2f2; padding: 10px; border: 1px dashed #fca5a5; margin-bottom: 15px; border-radius: 4px; }
        pre { background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Feedback Reporter Workbench</h1>
    
    <div class="banner">
        <strong>⚠️ Notice (Development Only):</strong> This screen is a Workbench UI exclusively for package development and manual testing. The package itself is headless and does not provide a UI.
    </div>

    <div class="redacted-box" data-feedback-redact>
        <strong>Redacted Element (data-feedback-redact):</strong> Sensitive text / personal information (e.g., 1234-5678-9012)
    </div>

    <div class="ignore-box" data-feedback-ignore>
        <strong>Excluded from Capture (data-feedback-ignore):</strong> This block will not appear in the screenshot.
    </div>

    <div class="form-group">
        <label for="message">Issue / Feedback Description:</label>
        <textarea id="message" rows="4" placeholder="What happened?"></textarea>
    </div>

    <div class="form-group">
        <label for="user-file">Manual Attachments (Optional):</label>
        <input type="file" id="user-file" accept="image/png,image/jpeg,image/webp" multiple>
    </div>

    <div class="form-group">
        <button id="submit-btn" type="button">Submit Feedback (with auto-capture)</button>
    </div>

    <h3>Submission Result / Response</h3>
    <pre id="result">Results will be displayed here</pre>

    <script type="module">
        import { createFeedbackReporter } from '/dist/index.js'

        const reporter = createFeedbackReporter({
            endpoint: @json(route('feedback-reporter.store')),
            availabilityEndpoint: @json(route('feedback-reporter.availability')),
        })

        const submitBtn = document.getElementById('submit-btn')
        const messageEl = document.getElementById('message')
        const fileEl = document.getElementById('user-file')
        const resultEl = document.getElementById('result')

        submitBtn.addEventListener('click', async () => {
            submitBtn.disabled = true
            resultEl.textContent = 'Submitting...'

            try {
                const attachments = []
                if (fileEl.files && fileEl.files.length > 0) {
                    for (const file of fileEl.files) {
                        attachments.push({
                            file,
                            source: 'attachment'
                        })
                    }
                }

                const res = await reporter.report({
                    message: messageEl.value,
                    attachments
                })

                resultEl.textContent = JSON.stringify(res, null, 2)
            } catch (err) {
                resultEl.textContent = 'Error: ' + (err.message || String(err))
            } finally {
                submitBtn.disabled = false
            }
        })
    </script>
</body>
</html>
