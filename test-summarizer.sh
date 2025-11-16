#!/bin/bash

# Test script for file upload and summarization
echo "Testing File Upload and Summarization API"
echo "=========================================="

# Create a sample text file for testing
cat > sample-test.txt << 'EOF'
Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task. It works by identifying patterns in large datasets and using these patterns to make predictions or decisions about new, unseen data.

There are three main types of machine learning: supervised learning, where algorithms learn from labeled training data; unsupervised learning, where algorithms find hidden patterns in data without labels; and reinforcement learning, where algorithms learn through trial and error by receiving rewards or penalties for their actions.

Popular machine learning algorithms include linear regression for predicting continuous values, decision trees for classification tasks, neural networks for complex pattern recognition, and clustering algorithms for grouping similar data points. These algorithms are widely used in applications such as image recognition, natural language processing, recommendation systems, and autonomous vehicles.

The success of machine learning depends heavily on the quality and quantity of training data, proper feature engineering, algorithm selection, and careful validation to ensure models generalize well to new data and avoid overfitting to training examples.
EOF

echo "Created sample-test.txt for testing"

# Test 1: Upload file
echo -e "\n1. Testing file upload..."
UPLOAD_RESPONSE=$(curl -s -F "file=@sample-test.txt" http://localhost:3001/api/upload)
echo "Upload response: $UPLOAD_RESPONSE"

# Extract jobId from response
JOB_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "Error: Failed to get jobId from upload response"
    exit 1
fi

echo "Got jobId: $JOB_ID"

# Test 2: Start analysis
echo -e "\n2. Starting analysis..."
ANALYZE_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/analyze" \
    -H "Content-Type: application/json" \
    -d "{\"jobId\":\"$JOB_ID\",\"tasks\":[\"summary\"]}")
echo "Analyze response: $ANALYZE_RESPONSE"

# Test 3: Poll for results
echo -e "\n3. Polling for results..."
for i in {1..30}; do
    STATUS_RESPONSE=$(curl -s "http://localhost:3001/api/analyze/$JOB_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    echo "Attempt $i - Status: $STATUS"
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
        echo "Final response: $STATUS_RESPONSE" | python -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
        break
    fi
    
    sleep 2
done

# Clean up
rm -f sample-test.txt

echo -e "\nTest completed!"