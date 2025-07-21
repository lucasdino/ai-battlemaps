# Contributing to Dungeon Coder

Thank you for your interest in contributing to Dungeon Coder! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

- Use the [GitHub issue tracker](https://github.com/WeiHanTu/ai-battlemaps/issues)
- Include a clear description of the bug
- Provide steps to reproduce the issue
- Include system information (OS, browser, etc.)

### Suggesting Features

- Use the [GitHub issue tracker](https://github.com/WeiHanTu/ai-battlemaps/issues)
- Describe the feature and its benefits
- Include mockups or examples if applicable

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow the coding style guidelines below
   - Add tests if applicable
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m 'Add: brief description of your changes'
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

## 📝 Coding Style Guidelines

### JavaScript/React
- Use ES6+ features
- Follow React best practices
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Use Prettier for code formatting

### Python
- Follow PEP 8 style guidelines
- Use type hints where applicable
- Add docstrings for functions and classes
- Use meaningful variable names

### General
- Write clear, readable code
- Add comments for complex logic
- Keep functions small and focused
- Test your changes thoroughly

## 🧪 Testing

- Run existing tests before making changes
- Add tests for new features
- Ensure all tests pass before submitting PR

### Frontend Testing
```bash
cd website/frontend
npm test
```

### Backend Testing
```bash
cd website/backend
npm test
```

## 📚 Documentation

- Update README.md if you add new features
- Add comments to complex code
- Update API documentation if you modify endpoints
- Include examples for new features

## 🚀 Development Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/ai-battlemaps.git
   cd ai-battlemaps
   ```

2. **Set up the development environment**
   ```bash
   # Backend
   cd website/backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   
   # Engine
   cd ../../engine/layoutgen
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd website/backend
   node server.js
   
   # Frontend (Terminal 2)
   cd website/frontend
   npm run dev
   
   # Engine (Terminal 3)
   cd engine/layoutgen
   source venv/bin/activate
   python app.py
   ```

## 🔧 Project Structure

### Key Directories
- `website/frontend/src/components/` - React components
- `website/backend/routes/` - API endpoints
- `engine/` - AI and processing engines
- `figs/` - Documentation images

### Adding New Features
1. **Frontend**: Add components in `website/frontend/src/components/`
2. **Backend**: Add routes in `website/backend/routes/`
3. **AI Engine**: Add modules in `engine/`
4. **Documentation**: Update README and add images to `figs/`

## 📋 Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation is updated
- [ ] No console errors
- [ ] Feature works as expected

### PR Description
- Describe the changes made
- Include screenshots for UI changes
- Reference related issues
- List any breaking changes

## 🎯 Areas for Contribution

### High Priority
- Bug fixes
- Performance improvements
- Documentation updates
- Test coverage

### Medium Priority
- New AI model integrations
- UI/UX improvements
- Additional asset types
- Export features

### Low Priority
- Code refactoring
- Optimization
- Additional examples
- Community features

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: Contact project maintainers directly

## 🙏 Recognition

Contributors will be recognized in:
- Project README
- Release notes
- Contributor hall of fame

Thank you for contributing to Dungeon Coder! 🏰 