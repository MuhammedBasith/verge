// Simple markdown renderer for message content

export const renderMarkdown = (text: string): JSX.Element => {
  // Split text into lines and process each line
  const lines = text.split('\n');
  
  const processedLines = lines.map((line, lineIndex) => {
    // Handle bullet points (lines starting with * )
    if (line.trim().startsWith('* ')) {
      const content = line.replace(/^\s*\*\s*/, '');
      return (
        <li key={lineIndex} className="ml-4 mb-2">
          {processInlineMarkdown(content)}
        </li>
      );
    }
    
    // Handle regular lines
    if (line.trim()) {
      return (
        <p key={lineIndex} className="mb-2">
          {processInlineMarkdown(line)}
        </p>
      );
    }
    
    // Empty lines
    return <br key={lineIndex} />;
  });
  
  // Group consecutive list items into <ul> elements
  const groupedElements: JSX.Element[] = [];
  let currentList: JSX.Element[] = [];
  
  processedLines.forEach((element, index) => {
    if (element.type === 'li') {
      currentList.push(element);
    } else {
      if (currentList.length > 0) {
        groupedElements.push(
          <ul key={`list-${index}`} className="list-disc list-outside mb-2">
            {currentList}
          </ul>
        );
        currentList = [];
      }
      groupedElements.push(element);
    }
  });
  
  // Handle any remaining list items
  if (currentList.length > 0) {
    groupedElements.push(
      <ul key="list-final" className="list-disc list-outside mb-2">
        {currentList}
      </ul>
    );
  }
  
  return <div>{groupedElements}</div>;
};

const processInlineMarkdown = (text: string): (string | JSX.Element)[] => {
  // Handle bold text (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold">
          {boldText}
        </strong>
      );
    }
    return part;
  });
};
