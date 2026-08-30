import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

const _siteOrigin = 'https://fantasavuto.web.app';

class SeoHead extends StatelessComponent {
  const SeoHead({
    required this.title,
    required this.description,
    required this.canonicalPath,
    this.robots = 'index,follow',
    this.ogType = 'website',
    super.key,
  });

  final String title;
  final String description;
  final String canonicalPath;
  final String robots;
  final String ogType;

  String get canonicalUrl => canonicalPath.startsWith('http')
      ? canonicalPath
      : '$_siteOrigin$canonicalPath';

  Component _propertyMeta(String property, String content) {
    return Component.element(
      tag: 'meta',
      attributes: {'property': property, 'content': content},
      children: const [],
    );
  }

  @override
  Component build(BuildContext context) {
    return Document.head(
      title: title,
      meta: {
        'description': description,
        'robots': robots,
        'twitter:card': 'summary',
        'twitter:title': title,
        'twitter:description': description,
      },
      children: [
        link(href: canonicalUrl, rel: 'canonical'),
        _propertyMeta('og:site_name', 'Fantasavuto'),
        _propertyMeta('og:locale', 'it_IT'),
        _propertyMeta('og:type', ogType),
        _propertyMeta('og:title', title),
        _propertyMeta('og:description', description),
        _propertyMeta('og:url', canonicalUrl),
      ],
    );
  }
}
