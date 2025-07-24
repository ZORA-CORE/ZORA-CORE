from nemo.collections.nlp.models import TextClassificationModel

def demo_nemo():
    model = TextClassificationModel.from_pretrained("nvidia/bert-base")
    result = model.classifytext(["ZORA is the future."])
    return result
