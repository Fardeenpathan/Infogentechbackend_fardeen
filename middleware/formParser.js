// Middleware to parse JSON fields in multipart form data for dynamic blog content
const parseFormJsonFields = (req, res, next) => {
  try {
    // Handle tags[] array format
    if (req.body['tags[]']) {
      req.body.tags = Array.isArray(req.body['tags[]']) ? req.body['tags[]'] : [req.body['tags[]']];
      delete req.body['tags[]'];
    }
    
    // Handle dynamic blocks[index][field] format
    const blocks = {};
    const blocksToDelete = [];
    
    Object.keys(req.body).forEach(key => {
      const blockMatch = key.match(/^blocks\[(\d+)\]\[([^\]]+)\](?:\[([^\]]+)\])?$/);
      if (blockMatch) {
        const [, index, field, subfield] = blockMatch;
        const blockIndex = parseInt(index);
        
        if (!blocks[blockIndex]) {
          blocks[blockIndex] = { type: '', data: {}, order: blockIndex };
        }
        
        if (field === 'type') {
          blocks[blockIndex].type = req.body[key];
        } else if (field === 'data') {
          if (subfield) {
            // Handle array fields for lists
            if (key.endsWith('[]')) {
              if (!blocks[blockIndex].data[subfield]) {
                blocks[blockIndex].data[subfield] = [];
              }
              if (Array.isArray(req.body[key])) {
                blocks[blockIndex].data[subfield] = req.body[key];
              } else {
                blocks[blockIndex].data[subfield].push(req.body[key]);
              }
            } else {
              // Regular data fields (text, content, level, etc.)
              blocks[blockIndex].data[subfield] = req.body[key];
            }
          }
        } else if (field === 'order') {
          blocks[blockIndex].order = parseInt(req.body[key]) || blockIndex;
        }
        
        blocksToDelete.push(key);
      }
    });
    
    // Clean up processed block fields
    blocksToDelete.forEach(key => delete req.body[key]);
    
    // Convert blocks object to array
    if (Object.keys(blocks).length > 0) {
      req.body.blocks = Object.keys(blocks)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(index => blocks[index]);
    }
    
    // Parse JSON fields that might come as strings in form data
    const jsonFields = ['tags', 'blocks', 'seo'];
    
    jsonFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (parseError) {
          console.log(`Warning: Could not parse ${field} as JSON:`, req.body[field]);
        }
      }
    });
    
    // Handle nested SEO fields that come as seo[field] format
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('seo[') && key.endsWith(']')) {
        const seoField = key.slice(4, -1); // Remove 'seo[' and ']'
        if (!req.body.seo) req.body.seo = {};
        
        // Parse JSON for keywords field
        if (seoField === 'keywords' && typeof req.body[key] === 'string') {
          try {
            req.body.seo[seoField] = JSON.parse(req.body[key]);
          } catch (parseError) {
            req.body.seo[seoField] = req.body[key];
          }
        } else {
          req.body.seo[seoField] = req.body[key];
        }
        delete req.body[key];
      }
    });

    const faqs = {};
    const faqsToDelete = [];
    
    Object.keys(req.body).forEach(key => {
      const faqMatch = key.match(/^faqs\[(\d+)\]\[([^\]]+)\]$/);
      if (faqMatch) {
        const [, index, field] = faqMatch;
        const faqIndex = parseInt(index);
        
        if (!faqs[faqIndex]) {
          faqs[faqIndex] = {};
        }
        
        faqs[faqIndex][field] = req.body[key];
        faqsToDelete.push(key);
      }
    });
    
    // Clean up processed FAQ fields
    faqsToDelete.forEach(key => delete req.body[key]);
    
    // Convert faqs object to array
    if (Object.keys(faqs).length > 0) {
      req.body.faqs = Object.keys(faqs)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(index => faqs[index]);
    }
    
    // Fix block data field names (convert text to content, code to content)
    if (req.body.blocks && Array.isArray(req.body.blocks)) {
      req.body.blocks.forEach(block => {
        if (block.data) {
          // Convert 'text' to 'content' for paragraph and heading blocks
          if (block.data.text && !block.data.content) {
            block.data.content = block.data.text;
            delete block.data.text;
          }
          // Convert 'code' to 'content' for code blocks
          if (block.data.code && !block.data.content) {
            block.data.content = block.data.code;
            delete block.data.code;
          }
          // Convert string level to number
          if (block.data.level && typeof block.data.level === 'string') {
            block.data.level = parseInt(block.data.level);
          }
        }
      });
    }
    
    console.log('Final parsed body:', JSON.stringify(req.body, null, 2));
    next();
  } catch (error) {
    console.error('Form parsing error:', error);
    next(error);
  }
};

module.exports = { parseFormJsonFields };