#!/bin/bash

# Test script to verify flashcard creation

echo "🧪 Testing flashcard generation and card creation..."

# Sample text
TEXT="The Python programming language was created by Guido van Rossum and first released in 1991. Python emphasizes code readability and simplicity. It supports multiple programming paradigms including procedural, object-oriented, and functional programming. Python has a large standard library and a thriving ecosystem of third-party packages available through PyPI."

# Call the flashcard generation endpoint
echo "📝 Generating 3 flashcards from sample text..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/flashcards/generate \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEXT\", \"numFlashcards\": 3}")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Test complete!"
