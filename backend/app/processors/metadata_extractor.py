"""
AI-Powered Metadata Extraction Module
Extracts title, author, year, keywords, and subject from document text
Uses NLP patterns and heuristics for offline extraction
"""

import re
from collections import Counter
from datetime import datetime
import json


class MetadataExtractor:
    """Extract metadata from document text using AI/NLP techniques"""
    
    # Common subject categories with keywords
    SUBJECT_CATEGORIES = {
        'Science': ['science', 'research', 'study', 'experiment', 'theory', 'hypothesis', 'data', 'analysis'],
        'Technology': ['technology', 'computer', 'software', 'digital', 'internet', 'algorithm', 'programming', 'AI'],
        'History': ['history', 'historical', 'century', 'ancient', 'medieval', 'war', 'civilization', 'empire'],
        'Literature': ['literature', 'novel', 'poetry', 'author', 'story', 'narrative', 'fiction', 'prose'],
        'Medicine': ['medical', 'health', 'disease', 'treatment', 'patient', 'clinical', 'diagnosis', 'therapy'],
        'Law': ['law', 'legal', 'court', 'justice', 'rights', 'constitution', 'statute', 'regulation'],
        'Business': ['business', 'management', 'marketing', 'finance', 'economics', 'trade', 'commerce'],
        'Education': ['education', 'learning', 'teaching', 'student', 'school', 'university', 'curriculum'],
        'Arts': ['art', 'music', 'painting', 'sculpture', 'artist', 'creative', 'aesthetic', 'gallery'],
        'Philosophy': ['philosophy', 'ethics', 'logic', 'metaphysics', 'epistemology', 'moral', 'wisdom'],
        'Religion': ['religion', 'faith', 'spiritual', 'church', 'temple', 'sacred', 'divine', 'worship'],
        'Geography': ['geography', 'location', 'region', 'country', 'city', 'map', 'terrain', 'climate'],
        'Mathematics': ['mathematics', 'equation', 'theorem', 'proof', 'algebra', 'geometry', 'calculus'],
        'Politics': ['politics', 'government', 'policy', 'democracy', 'election', 'parliament', 'senator'],
        'Environment': ['environment', 'ecology', 'climate', 'conservation', 'pollution', 'sustainability'],
    }
    
    # Common title indicators
    TITLE_PATTERNS = [
        r'^([A-Z][^.!?]*[A-Z][^.!?]*)',  # Lines starting with capitals
        r'(?:Title|TITLE):\s*(.+)',       # Explicit title label
        r'^([A-Z\s]{10,})',               # ALL CAPS titles
    ]
    
    # Author name patterns
    AUTHOR_PATTERNS = [
        r'(?:by|By|BY)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',  # "by John Smith"
        r'(?:Author|AUTHOR):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',  # "Author: John Smith"
        r'(?:Written by|Written By)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        r'^([A-Z][a-z]+\s+[A-Z][a-z]+)$',  # Standalone name on a line
    ]
    
    # Year patterns
    YEAR_PATTERNS = [
        r'\b(19\d{2}|20\d{2})\b',  # Years 1900-2099
        r'(?:Year|YEAR|Published):\s*(\d{4})',
        r'©\s*(\d{4})',  # Copyright year
    ]
    
    # Common stop words to exclude from keywords
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
        'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
        'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'page',
        'pages', 'chapter', 'section', 'figure', 'table', 'note', 'notes'
    }
    
    def __init__(self):
        self.current_year = datetime.now().year
    
    def extract_title(self, text, filename=None):
        """
        Extract document title from text
        Returns: (title, confidence_score)
        """
        if not text or not text.strip():
            if filename:
                # Use filename as fallback
                title = filename.replace('_', ' ').replace('.pdf', '').replace('.txt', '')
                return title, 0.3
            return None, 0.0
        
        lines = text.strip().split('\n')
        
        # Strategy 1: Look for explicit title markers
        for pattern in self.TITLE_PATTERNS:
            for line in lines[:10]:  # Check first 10 lines
                match = re.search(pattern, line.strip())
                if match:
                    title = match.group(1).strip()
                    if 10 <= len(title) <= 200:  # Reasonable title length
                        return title, 0.9
        
        # Strategy 2: First non-empty line that looks like a title
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 10 and len(line) < 200:
                # Check if it's likely a title (starts with capital, no period at end)
                if line[0].isupper() and not line.endswith('.'):
                    return line, 0.7
        
        # Strategy 3: Use filename as fallback
        if filename:
            title = filename.replace('_', ' ').replace('.pdf', '').replace('.txt', '')
            return title, 0.4
        
        return None, 0.0
    
    def extract_authors(self, text):
        """
        Extract author names from text
        Returns: (author_list, confidence_score)
        """
        if not text or not text.strip():
            return [], 0.0
        
        authors = []
        lines = text.strip().split('\n')
        
        # Check first 20 lines for author patterns
        for line in lines[:20]:
            for pattern in self.AUTHOR_PATTERNS:
                match = re.search(pattern, line)
                if match:
                    author = match.group(1).strip()
                    # Validate: should be 2-4 words, each capitalized
                    words = author.split()
                    if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
                        authors.append(author)
        
        if authors:
            # Return the first author found (most likely to be correct)
            return authors[0], 0.8
        
        return None, 0.0
    
    def extract_year(self, text):
        """
        Extract publication year from text
        Returns: (year, confidence_score)
        """
        if not text or not text.strip():
            return None, 0.0
        
        years = []
        
        # Look for year patterns
        for pattern in self.YEAR_PATTERNS:
            matches = re.findall(pattern, text[:2000])  # Check first 2000 chars
            for match in matches:
                year = int(match)
                # Validate year is reasonable (1800-current year + 1)
                if 1800 <= year <= self.current_year + 1:
                    years.append(year)
        
        if years:
            # Use most recent year found (likely publication year)
            year = max(years)
            
            # Higher confidence if year is recent
            if self.current_year - 50 <= year <= self.current_year:
                confidence = 0.9
            else:
                confidence = 0.7
            
            return str(year), confidence
        
        return None, 0.0
    
    def extract_keywords(self, text, max_keywords=10):
        """
        Extract keywords from text using frequency analysis
        Returns: (keywords_list, confidence_score)
        """
        if not text or not text.strip():
            return [], 0.0
        
        # Clean and tokenize text
        text = text.lower()
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-z\s]', ' ', text)
        words = text.split()
        
        # Filter out stop words and short words
        meaningful_words = [
            word for word in words 
            if word not in self.STOP_WORDS and len(word) > 3
        ]
        
        # Count word frequencies
        word_freq = Counter(meaningful_words)
        
        # Get top keywords
        top_keywords = [word for word, count in word_freq.most_common(max_keywords)]
        
        if top_keywords:
            return top_keywords[:max_keywords], 0.8
        
        return [], 0.0
    
    def suggest_subject(self, text, keywords=None):
        """
        Suggest subject category based on text content
        Returns: (subject, confidence_score)
        """
        if not text or not text.strip():
            return None, 0.0
        
        text_lower = text.lower()
        
        # Score each category
        category_scores = {}
        
        for category, category_keywords in self.SUBJECT_CATEGORIES.items():
            score = 0
            for keyword in category_keywords:
                # Count occurrences of category keywords in text
                score += text_lower.count(keyword)
            
            category_scores[category] = score
        
        # Find category with highest score
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            best_score = category_scores[best_category]
            
            if best_score > 0:
                # Normalize confidence (cap at 0.9)
                confidence = min(0.9, best_score / 10)
                return best_category, confidence
        
        return 'General', 0.3  # Default category
    
    def extract_all_metadata(self, text, filename=None):
        """
        Extract all metadata from text
        Returns: dict with all extracted metadata and confidence scores
        """
        # Extract individual fields
        title, title_conf = self.extract_title(text, filename)
        author, author_conf = self.extract_authors(text)
        year, year_conf = self.extract_year(text)
        keywords, keywords_conf = self.extract_keywords(text)
        subject, subject_conf = self.suggest_subject(text, keywords)
        
        # Calculate overall confidence
        confidences = [title_conf, author_conf, year_conf, keywords_conf, subject_conf]
        overall_confidence = sum(confidences) / len(confidences)
        
        return {
            'title': title,
            'author': author,
            'year': year,
            'subject': subject,
            'keywords': ', '.join(keywords) if keywords else '',
            'confidence_scores': {
                'title': round(title_conf, 2),
                'author': round(author_conf, 2),
                'year': round(year_conf, 2),
                'subject': round(subject_conf, 2),
                'keywords': round(keywords_conf, 2),
                'overall': round(overall_confidence, 2)
            }
        }


# Convenience function for easy import
def extract_metadata(text, filename=None):
    """
    Extract metadata from document text
    
    Args:
        text (str): Document text content
        filename (str): Optional filename for fallback title
    
    Returns:
        dict: Extracted metadata with confidence scores
    """
    extractor = MetadataExtractor()
    return extractor.extract_all_metadata(text, filename)


# Test function
if __name__ == '__main__':
    # Test with sample text
    sample_text = """
    Digital Libraries in the Modern Age
    
    By Dr. Sarah Johnson
    
    Published: 2025
    
    This comprehensive study examines the evolution of digital libraries and their impact
    on information access in the 21st century. The research covers digital preservation,
    metadata standards, and user experience in modern library systems.
    
    Keywords: digital libraries, information science, metadata, preservation, technology
    """
    
    result = extract_metadata(sample_text, "sample_document.pdf")
    print(json.dumps(result, indent=2))
