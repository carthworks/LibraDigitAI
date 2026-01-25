"""
Test Metadata Extraction
Tests the metadata extractor with sample data
"""

from metadata_extractor import extract_metadata
import json

# Test with sample document text
sample_text = """
Introduction to Artificial Intelligence

By Dr. John Smith and Dr. Mary Johnson

Published: 2024

This comprehensive guide explores the fundamentals of artificial intelligence,
including machine learning, neural networks, and deep learning. The book covers
both theoretical concepts and practical applications in modern AI systems.

The research presented here builds on decades of computer science and mathematics,
providing readers with a solid foundation in AI technology and its applications
in various domains including healthcare, finance, and robotics.

Keywords: artificial intelligence, machine learning, neural networks, deep learning,
computer science, technology, algorithms, data science
"""

print("🧪 Testing Metadata Extraction...")
print("=" * 60)

try:
    result = extract_metadata(sample_text, "ai_introduction.pdf")
    
    print("\n✅ Extraction successful!")
    print("\n📊 Results:")
    print(json.dumps(result, indent=2))
    
    print("\n" + "=" * 60)
    print("✅ Test passed!")
    
except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
