import random
import numpy as np

# constants
punctuation = ['.', '!', '?']
punctuation_ignore = ['\"', '\'']
sentence_length = 4

# logistic function used to calculated whether a word should end a sentence in rollDiceEnder
def logistic_f(x):
    return 1/(1 + np.exp(-(x/sentence_length - 4))) * 0.88 + 0.12

# Decide which word to pick from markov model given weights of some current word.
def rollDice(word, markovModel, weights):
    sumWeights = weights[word]
    dice = random.random() * sumWeights
    for i in markovModel[word]:
        currWeight = markovModel[word][i]
        if currWeight > dice:
            return i
        else:
            dice -= currWeight
    # Faalback: return a random word from the options
    return random.choice(list(markovModel[word].keys()))

# Decide which word to pick from starter model given weights of all starter words.
def rollDiceStarter(sentenceStarters, starterWeight):
    dice = random.random() * starterWeight
    for i in sentenceStarters:
        currWeight = sentenceStarters[i]
        if currWeight > dice:
            return i
        else:
            dice -= currWeight
    # Fallback: return a random starter
    return random.choice(list(sentenceStarters.keys()))

# Decide whether to pick word from ender model, then what punctuation to use (if picked) given weight and current sentence length.
def rollDiceEnder(word, sentenceLen, sentenceEnders, enderWeights):
    pickWeight = logistic_f(sentenceLen)
    dice = random.random()
    if (dice > pickWeight):
        return False, None
    sumWeights = enderWeights[word]
    dice = random.random() * sumWeights
    for i in sentenceEnders[word]:
        currWeight = sentenceEnders[word][i]
        if currWeight > dice:
            return True, i
        else:
            dice -= currWeight
    # Fallback: return a random punctuation
    return True, random.choice(list(sentenceEnders[word].keys()))


# Main function to generate text from input
def generate_text(input_text, num_words=100):
    """
    Generate text using Markov chain from input text.
    
    Args:
        input_text: String of text to use as training data
        num_words: Number of words to generate
    
    Returns:
        Generated text string
    """

    # Use the provided input_text directly
    allContent = [input_text]

    # split each file's text into words delimited by spaces
    allWords = []
    for i in allContent:
        allWords.append(i.split())

    del allContent

    # remove unwanted punctuation, and sentence-ending punctuation should be separate elements
    allPunctuated = []
    for i in allWords:
        currPunctuated = []
        for j in i:
            if len(j) == 0:
                continue
            if j[-1] in punctuation_ignore:
                j = j[0:-1]
            if len(j) > 0 and j[-1] in punctuation:
                currPunctuated.append(j[0:-1])
                currPunctuated.append(j[-1])
                continue
            if len(j) > 0:
                currPunctuated.append(j)
        allPunctuated.append(currPunctuated)

    del allWords

    # Parse all words into Markov model, including sentence starters and enders
    markovModel = {}
    sentenceStarters = {}
    sentenceEnders = {}
    weights = {}
    starterWeight = 0
    enderWeights = {}

    for i in allPunctuated:
        for j in range(len(i) - 1):
            currWord = i[j]
            nextWord = i[j + 1]
            # Case 1: current word is a punctuation mark. Do nothing
            if currWord in punctuation:
                continue
            # Case 2: current word comes before a punctuation. Then:
            # - add word as a key of sentenceEnders. increase weight of corresponding punctuation by 1
            # - add 1 to total weight of all punctuation associated with the word
            elif nextWord in punctuation:
                if currWord in sentenceEnders:
                    if nextWord in sentenceEnders[currWord]:
                        sentenceEnders[currWord][nextWord] += 1
                    else:
                        sentenceEnders[currWord][nextWord] = 1
                else:
                    sentenceEnders[currWord] = {nextWord: 1}
                if currWord in enderWeights:
                    enderWeights[currWord] += 1
                else:
                    enderWeights[currWord] = 1
                continue
            # Case 3: current word comes after punctuation. Then:
            # - add word as a key of sentenceStarters. Increase its weight by 1
            # - add 1 to sum total weight of all sentence starters
            elif j > 0 and i[j - 1] in punctuation:
                if currWord in sentenceStarters:
                    sentenceStarters[currWord] += 1
                else:
                    sentenceStarters[currWord] = 1
                starterWeight += 1
                currWord = currWord.lower()
            # For cases 2 and 3:
            # - add 1 to the weight of the word following curr
            # - add 1 to the sum total of all weights of words following curr
            if currWord in markovModel:
                if nextWord in markovModel[currWord]:
                    markovModel[currWord][nextWord] += 1
                else:
                    markovModel[currWord][nextWord] = 1
            else:
                markovModel[currWord] = {nextWord: 1}
            if currWord in weights:
                weights[currWord] += 1
            else:
                weights[currWord] = 1

    # Generate text using the Markov model
    output = ''
    currWordCount = 0
    currWord = ''

    for i in range(num_words):
        # Starting a sentence
        if currWordCount == 0:
            currWord = rollDiceStarter(sentenceStarters, starterWeight)
            output += ' ' + currWord
            currWordCount += 1
            currWord = currWord.lower()
            continue
        # Finding a sentence ender
        if currWord in sentenceEnders:
            endSentence, punct = rollDiceEnder(currWord, currWordCount, sentenceEnders, enderWeights)
            if (not endSentence) and (currWord in markovModel):
                currWord = rollDice(currWord, markovModel, weights)
                output += ' ' + currWord
                currWordCount += 1
            else:
                if (not punct):
                    punct = '.'
                output += punct
                currWordCount = 0
            continue
        # word not in model
        if currWord not in markovModel:
            output += '.'
            currWordCount = 0
            continue
        # everything else
        currWord = rollDice(currWord, markovModel, weights)
        output += ' ' + currWord
        currWordCount += 1    
    
    return output.strip()