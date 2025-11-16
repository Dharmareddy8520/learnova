#!/bin/bash

echo "Testing Multi-Task Document Analysis"
echo "==================================="

# Test all tasks together
echo -e "\nTesting all tasks (summary, quiz, flashcards, qa)..."
UPLOAD_RESP=$(curl -s -F "file=@sample-ml-text.txt" http://localhost:3001/api/upload)
UPLOAD_ID=$(echo "$UPLOAD_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('uploadId',''))")
echo "Upload ID: $UPLOAD_ID"

ANALYZE_RESP=$(curl -s -X POST "http://localhost:3001/api/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"uploadId\":\"$UPLOAD_ID\",\"tasks\":{\"summarize\":true,\"quiz\":{\"numQuestions\":5},\"flashcards\":{\"count\":8},\"qa\":{}}}")
  
JOB_ID=$(echo "$ANALYZE_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))")
echo "Job ID: $JOB_ID"

echo -e "\nWaiting for processing..."
for i in {1..10}; do
    STATUS_RESP=$(curl -s "http://localhost:3001/api/analyze/$JOB_ID/status")
    STATUS=$(echo "$STATUS_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
    echo "Attempt $i: $STATUS"
    
    if [ "$STATUS" = "done" ] || [ "$STATUS" = "failed" ]; then
        echo -e "\nFinal Results:"
        echo "$STATUS_RESP" | python -m json.tool
        break
    fi
    sleep 3
done

echo -e "\nTest completed!"